// Supabase Edge Function: stripe-webhook
// Receives Stripe webhook events and updates tenant_subscriptions.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

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
            const planCode = (sub.metadata?.plan_code as string | undefined) ?? null;
            const interval = (sub.metadata?.interval as string | undefined) ?? null;

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

            await supabaseAdmin.from("tenant_subscriptions").upsert({
                tenant_id: effectiveTenantId,
                plan_code: planCode ?? "start",
                plan_name: planName,
                status: mappedStatus,
                billing_interval: interval === "year" ? "year" : interval === "month" ? "month" : null,
                stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
                stripe_subscription_id: sub.id,
                stripe_price_id:
                    sub.items?.data?.[0]?.price?.id ?? null,
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
                // nothing required; subscription events will follow
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
