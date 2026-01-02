// Supabase Edge Function: stripe-create-checkout
// Creates a Stripe Checkout Session for subscriptions.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type Interval = "month" | "year";

type Body = {
    plan_code: "start" | "pro";
    interval: Interval;
};

function getPriceId(planCode: Body["plan_code"], interval: Interval) {
    const envKey =
        planCode === "start"
            ? interval === "month"
                ? "STRIPE_PRICE_START_MONTH"
                : "STRIPE_PRICE_START_YEAR"
            : interval === "month"
                ? "STRIPE_PRICE_PRO_MONTH"
                : "STRIPE_PRICE_PRO_YEAR";

    const priceId = Deno.env.get(envKey);
    if (!priceId) {
        throw new Error(`Missing env ${envKey}`);
    }
    return priceId;
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

        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const {
            data: { user },
            error: userError,
        } = await supabaseAuth.auth.getUser();

        if (userError) throw userError;
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

        const body = (await req.json()) as Body;
        if (!body?.plan_code || !body?.interval) {
            return new Response(JSON.stringify({ error: "Invalid body" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const priceId = getPriceId(body.plan_code, body.interval);

        // Look up tenant_id from profile
        const { data: profile, error: profileError } = await supabaseAuth
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) throw profileError;
        const tenantId = profile?.tenant_id;
        if (!tenantId) {
            return new Response(JSON.stringify({ error: "No tenant" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: subRow, error: subError } = await supabaseAdmin
            .from("tenant_subscriptions")
            .select("stripe_customer_id")
            .eq("tenant_id", tenantId)
            .maybeSingle();

        if (subError) throw subError;

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
        });

        let customerId = subRow?.stripe_customer_id ?? null;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email ?? undefined,
                metadata: {
                    tenant_id: tenantId,
                    saas_slug: "arena-sports",
                },
            });
            customerId = customer.id;

            await supabaseAdmin
                .from("tenant_subscriptions")
                .upsert({
                    tenant_id: tenantId,
                    stripe_customer_id: customerId,
                });
        }

        const origin = req.headers.get("origin") ?? "";
        const successUrl = `${origin}/dashboard`;
        const cancelUrl = `${origin}/dashboard`;

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            client_reference_id: tenantId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
            subscription_data: {
                metadata: {
                    tenant_id: tenantId,
                    plan_code: body.plan_code,
                    interval: body.interval,
                    saas_slug: "arena-sports",
                },
            },
            metadata: {
                tenant_id: tenantId,
                plan_code: body.plan_code,
                interval: body.interval,
                saas_slug: "arena-sports",
            },
        });

        return new Response(JSON.stringify({ url: session.url }), {
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
