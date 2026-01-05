// Supabase Edge Function: stripe-webhook
// Receives Stripe webhook events and updates tenant_subscriptions.

// @ts-nocheck

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

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

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error("Missing Supabase env (URL/SERVICE_ROLE)");
        }
        if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
        if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

        const signature = req.headers.get("stripe-signature");
        if (!signature) {
            return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
        const payload = await req.text();

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return new Response(JSON.stringify({ error: message }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const handleSubscription = async (sub: Stripe.Subscription) => {
            const tenantId = (sub.metadata?.tenant_id as string | undefined) ?? null;
            const priceId = sub.items?.data?.[0]?.price?.id ?? null;
            const inferred = inferPlanFromPriceId(priceId);
            const planCode = normalizePlanCode(sub.metadata?.plan_code) ?? inferred?.plan_code ?? "start";
            const interval =
                normalizeInterval(sub.metadata?.interval) ??
                inferred?.interval ??
                normalizeInterval(sub.items?.data?.[0]?.price?.recurring?.interval) ??
                null;

            const mappedStatus = mapStripeStatus(sub.status);
            const currentPeriodEnd = sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null;

            // Determine tenant_id if missing metadata by lookup
            let effectiveTenantId = tenantId;
            if (!effectiveTenantId) {
                const { data: row } = await supabaseAdmin
                    .from("tenant_subscriptions")
                    .select("tenant_id")
                    .eq("stripe_subscription_id", sub.id)
                    .maybeSingle();
                effectiveTenantId = row?.tenant_id ?? null;
            }

            if (!effectiveTenantId) return;

            const planName = planCode === "pro" ? "Arena Pro" : "Arena Start";
            const monthlyPrice =
                planCode === "pro" ? (interval === "year" ? 97 : 249) : 149;

            await supabaseAdmin.from("tenant_subscriptions").upsert({
                tenant_id: effectiveTenantId,
                plan_code: planCode ?? "start",
                plan_name: planName,
                monthly_price: monthlyPrice,
                status: mappedStatus,
                billing_interval: interval === "year" ? "year" : interval === "month" ? "month" : null,
                stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
                stripe_subscription_id: sub.id,
                stripe_price_id: priceId,
                current_period_end: currentPeriodEnd,
                cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            });
        };

        switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                await handleSubscription(sub);
                break;
            }
            case "checkout.session.completed": {
                // Some setups only send checkout events, or subscription events may arrive later.
                // Sync from the session subscription as a best-effort update.
                const session = event.data.object as Stripe.Checkout.Session;
                const subId =
                    typeof session.subscription === "string"
                        ? session.subscription
                        : (session.subscription as any)?.id;
                if (subId) {
                    const sub = await stripe.subscriptions.retrieve(String(subId));
                    await handleSubscription(sub);
                }
                break;
            }
            case "invoice.payment_failed": {
                // handled via subscription.updated most of the time
                break;
            }
            default:
                break;
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
