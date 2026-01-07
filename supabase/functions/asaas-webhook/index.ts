// Supabase Edge Function: asaas-webhook
// Receives Asaas webhook events and syncs tenant subscriptions.

// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

type PlanCode = "start" | "pro";
type Interval = "month" | "year";

const asaasWebhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

function formatUnknownError(err: unknown): string {
    if (err == null) return "Unknown error";
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

function parseAsaasDate(value: unknown): string | null {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        const parsed = new Date(`${year}-${month}-${day}`);
        return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
    }
    const parsed = new Date(trimmed);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function addDaysIso(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
}

function mapAsaasStatus(status: unknown): "active" | "past_due" | "canceled" {
    if (typeof status !== "string") return "canceled";
    const normalized = status.toUpperCase();
    if (normalized === "ACTIVE" || normalized === "PENDING") return "active";
    if (normalized === "OVERDUE" || normalized === "REFUSED") return "past_due";
    return "canceled";
}

function planCodeFromDescription(value: unknown): PlanCode | null {
    if (typeof value !== "string") return null;
    const lowered = value.toLowerCase();
    if (lowered.includes("pro")) return "pro";
    if (lowered.includes("start")) return "start";
    return null;
}

function mapCycleToInterval(cycle: unknown): Interval | null {
    if (typeof cycle !== "string") return null;
    const normalized = cycle.toUpperCase();
    if (normalized.includes("YEAR")) return "year";
    if (normalized.includes("MONTH")) return "month";
    return null;
}

function getPlanName(planCode: PlanCode): string {
    return planCode === "pro" ? "Arena Pro" : "Arena Start";
}

function getMonthlyPrice(planCode: PlanCode, interval: Interval): number {
    if (planCode === "pro") {
        return interval === "year" ? 97 : 249;
    }
    return 149;
}

async function handleSubscriptionEvent(
    supabaseAdmin: ReturnType<typeof createClient>,
    subscription: Record<string, unknown> | null,
    checkout: Record<string, unknown> | null
) {
    if (!subscription) return;

    const externalReference =
        (subscription["externalReference"] as string | undefined) ??
        (checkout?.["externalReference"] as string | undefined) ??
        null;

    let tenantId = externalReference;
    if (!tenantId) {
        const { data, error } = await supabaseAdmin
            .from("tenant_subscriptions")
            .select("tenant_id")
            .eq("asaas_subscription_id", subscription["id"])
            .maybeSingle();
        if (!error) {
            tenantId = data?.tenant_id ?? null;
        }
    }

    if (!tenantId) return;

    const planCode =
        (planCodeFromDescription(subscription["description"]) as PlanCode | null) ??
        (planCodeFromDescription(checkout?.["description"]) as PlanCode | null) ??
        "start";
    const interval = mapCycleToInterval(subscription["cycle"]) ?? "month";
    const planName = getPlanName(planCode);
    const monthlyPrice = getMonthlyPrice(planCode, interval);
    const mappedStatus = mapAsaasStatus(subscription["status"]);
    const nextDue = parseAsaasDate(subscription["nextDueDate"]);
    const graceEndsAt = mappedStatus === "past_due" ? addDaysIso(3) : null;

    await supabaseAdmin.from("tenant_subscriptions").upsert({
        tenant_id: tenantId,
        plan_code: planCode,
        plan_name: planName,
        billing_interval: interval,
        monthly_price: monthlyPrice,
        status: mappedStatus,
        current_period_end: nextDue,
        grace_ends_at: graceEndsAt,
        asaas_subscription_id: subscription["id"],
        asaas_customer_id:
            typeof subscription["customer"] === "string" ? subscription["customer"] : null,
        asaas_checkout_id: checkout?.["id"],
    });
}

function copyPayload(value: Record<string, unknown> | null): Record<string, unknown> {
    return value ? { ...value } : {};
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!asaasWebhookToken) {
            throw new Error("Missing ASAAS_WEBHOOK_TOKEN");
        }

        const header = req.headers.get("asaas-access-token");
        if (!header || header !== asaasWebhookToken) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let payload: Record<string, unknown> = {};
        try {
            payload = (await req.json()) as Record<string, unknown>;
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const eventId = String(payload["id"] ?? "").trim();
        if (!eventId) {
            return new Response(JSON.stringify({ error: "Missing event id" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error("Missing Supabase env (URL/SERVICE_ROLE)");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { error: insertError } = await supabaseAdmin.from("asaas_webhook_events").insert({
            event_id: eventId,
            payload: copyPayload(payload),
            status: "processing",
        });

        if (insertError) {
            const code = String(insertError.code ?? "");
            if (code === "23505") {
                return new Response(JSON.stringify({ received: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            throw insertError;
        }

        const eventType = String(payload["event"] ?? "").toUpperCase();
        const subscription = (payload["subscription"] as Record<string, unknown> | null) ?? null;
        const checkout = (payload["checkout"] as Record<string, unknown> | null) ?? null;

        try {
            switch (eventType) {
                case "SUBSCRIPTION_CREATED":
                case "SUBSCRIPTION_UPDATED":
                case "SUBSCRIPTION_INACTIVATED":
                case "SUBSCRIPTION_DELETED":
                    await handleSubscriptionEvent(supabaseAdmin, subscription, checkout);
                    break;
                default:
                    break;
            }

            await supabaseAdmin
                .from("asaas_webhook_events")
                .update({ processed_at: new Date().toISOString(), status: "done" })
                .eq("event_id", eventId);

            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } catch (innerErr) {
            await supabaseAdmin
                .from("asaas_webhook_events")
                .update({ processed_at: new Date().toISOString(), status: "failed" })
                .eq("event_id", eventId);
            throw innerErr;
        }
    } catch (err) {
        const message = formatUnknownError(err);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});