// Supabase Edge Function: stripe-sync-checkout
// Used by the app after redirect from Stripe Checkout to ensure tenant_subscriptions is updated.
// This is a fallback when webhook delivery/config isn't immediate.

// @ts-nocheck

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

type Body = {
    session_id?: string;
};

type Interval = "month" | "year";
type PlanCode = "start" | "pro";

function getEnvFirst(keys: string[]) {
    for (const key of keys) {
        const value = Deno.env.get(key);
        if (value) return { key, value };
    }
    return null;
}

function inferPlanFromPriceId(priceId: string | null): { plan_code: PlanCode; interval: Interval | null } | null {
    if (!priceId) return null;

    const startMonth = getEnvFirst([
        "STRIPE_PRICE_START_MONTH",
        "STRIPE_PRICE_START_MONTHLY",
        "VITE_STRIPE_PRICE_START_MONTHLY",
    ]);
    const startYear = getEnvFirst([
        "STRIPE_PRICE_START_YEAR",
        "STRIPE_PRICE_START_YEARLY",
        "VITE_STRIPE_PRICE_START_YEARLY",
    ]);
    const proMonth = getEnvFirst([
        "STRIPE_PRICE_PRO_MONTH",
        "STRIPE_PRICE_PRO_MONTHLY",
        "VITE_STRIPE_PRICE_PRO_MONTHLY",
    ]);
    const proYear = getEnvFirst([
        "STRIPE_PRICE_PRO_YEAR",
        "STRIPE_PRICE_PRO_YEARLY",
        "VITE_STRIPE_PRICE_PRO_YEARLY",
    ]);

    if (startMonth?.value === priceId) return { plan_code: "start", interval: "month" };
    if (startYear?.value === priceId) return { plan_code: "start", interval: "year" };
    if (proMonth?.value === priceId) return { plan_code: "pro", interval: "month" };
    if (proYear?.value === priceId) return { plan_code: "pro", interval: "year" };

    return null;
}

function normalizePlanCode(value: unknown): PlanCode | null {
    if (value === "start" || value === "pro") return value;
    if (typeof value === "string") {
        const v = value.toLowerCase();
        if (v === "start" || v === "pro") return v as PlanCode;
    }
    return null;
}

function normalizeInterval(value: unknown): Interval | null {
    if (value === "month" || value === "year") return value;
    if (typeof value === "string") {
        const v = value.toLowerCase();
        if (v === "month" || v === "year") return v as Interval;
    }
    return null;
}

function mapStripeStatus(status: string): "active" | "past_due" | "canceled" {
    if (status === "active" || status === "trialing") return "active";
    if (status === "past_due" || status === "unpaid" || status === "incomplete") {
        return "past_due";
    }
    return "canceled";
}

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

function getErrorStatusCode(err: unknown): number | null {
    if (!err || typeof err !== "object") return null;
    const anyErr = err as Record<string, unknown>;
    const statusCode = anyErr["statusCode"];
    if (typeof statusCode === "number" && Number.isFinite(statusCode)) return statusCode;
    const status = anyErr["status"];
    if (typeof status === "number" && Number.isFinite(status)) return status;
    return null;
}

function getStripeHintedStatus(message: string): number | null {
    const m = message.toLowerCase();
    if (m.includes("no such checkout.session") || m.includes("no such checkout session")) {
        return 404;
    }
    if (m.includes("invalid api key") || m.includes("api key provided is invalid")) {
        return 500;
    }
    if (m.includes("permission") || m.includes("unauthorized")) {
        return 401;
    }
    return null;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
            throw new Error("Missing Supabase env (URL/ANON/SERVICE_ROLE)");
        }
        if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let body: Body = {};
        try {
            body = (await req.json()) as Body;
        } catch {
            body = {};
        }

        const sessionId = String(body?.session_id || "").trim();
        if (!sessionId) {
            return new Response(JSON.stringify({ error: "Missing session_id" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const {
            data: { user },
            error: userError,
        } = await supabaseAuth.auth.getUser();

        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Tenant must be derived from the authenticated user's profile.
        // We verify it matches the checkout session to avoid cross-tenant updates.
        const { data: profiles, error: profileError } = await supabaseAuth
            .from("profiles")
            .select("tenant_id, updated_at, created_at")
            .eq("id", user.id)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1);

        if (profileError) throw profileError;
        const tenantIdFromProfile = profiles?.[0]?.tenant_id ?? null;
        if (!tenantIdFromProfile) {
            return new Response(JSON.stringify({ error: "No tenant" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["subscription"],
        });

        const tenantIdFromSession =
            (checkoutSession.client_reference_id as string | null) ??
            (checkoutSession.metadata?.tenant_id as string | undefined) ??
            null;

        if (!tenantIdFromSession || tenantIdFromSession !== tenantIdFromProfile) {
            return new Response(JSON.stringify({ error: "Tenant mismatch" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const subscriptionObj = checkoutSession.subscription as any;
        const subscriptionId =
            typeof subscriptionObj === "string"
                ? subscriptionObj
                : (subscriptionObj?.id as string | undefined) ?? null;

        if (!subscriptionId) {
            return new Response(
                JSON.stringify({ error: "Checkout session missing subscription" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const subscription =
            typeof subscriptionObj === "string"
                ? await stripe.subscriptions.retrieve(subscriptionId)
                : (subscriptionObj as Stripe.Subscription);

        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
        const inferred = inferPlanFromPriceId(priceId);

        const planCode =
            normalizePlanCode(subscription.metadata?.plan_code) ??
            normalizePlanCode(checkoutSession.metadata?.plan_code) ??
            inferred?.plan_code ??
            "start";

        const interval =
            normalizeInterval(subscription.metadata?.interval) ??
            normalizeInterval(checkoutSession.metadata?.interval) ??
            inferred?.interval ??
            normalizeInterval(subscription.items?.data?.[0]?.price?.recurring?.interval) ??
            null;

        const mappedStatus = mapStripeStatus(subscription.status);
        const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

        // Keep same pricing mapping used by the webhook to avoid UI drift.
        const normalizedPlanCode = planCode === "pro" ? "pro" : "start";
        const planName = normalizedPlanCode === "pro" ? "Arena Pro" : "Arena Start";
        const monthlyPrice =
            normalizedPlanCode === "pro"
                ? interval === "year"
                    ? 97
                    : 249
                : 149;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: updated, error: upsertError } = await supabaseAdmin
            .from("tenant_subscriptions")
            .upsert({
                tenant_id: tenantIdFromProfile,
                plan_code: normalizedPlanCode,
                plan_name: planName,
                monthly_price: monthlyPrice,
                status: mappedStatus,
                billing_interval:
                    interval === "year" ? "year" : interval === "month" ? "month" : null,
                stripe_customer_id:
                    typeof subscription.customer === "string"
                        ? subscription.customer
                        : subscription.customer?.id,
                stripe_subscription_id: subscription.id,
                stripe_price_id: priceId,
                current_period_end: currentPeriodEnd,
                cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
            })
            .select(
                "tenant_id, status, plan_code, plan_name, monthly_price, billing_interval, trial_started_at, trial_ends_at, grace_ends_at, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_end, cancel_at_period_end, created_at, updated_at"
            )
            .limit(1);

        if (upsertError) throw upsertError;

        return new Response(
            JSON.stringify({
                synced: true,
                tenant_id: tenantIdFromProfile,
                subscription: updated?.[0] ?? null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        const message = formatUnknownError(err);
        const explicitStatus = getErrorStatusCode(err);
        const hintedStatus = getStripeHintedStatus(message);
        const status =
            (explicitStatus && explicitStatus >= 400 && explicitStatus < 600
                ? explicitStatus
                : null) ??
            hintedStatus ??
            500;

        return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
