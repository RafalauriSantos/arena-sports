// Supabase Edge Function: stripe-create-portal-session
// Creates a Stripe Billing Portal Session to let customers manage/cancel subscription.

// @ts-nocheck

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

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

        const origin = req.headers.get("origin") ?? "";
        if (!origin) {
            return new Response(JSON.stringify({ error: "Missing Origin header" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const authHeader = req.headers.get("Authorization") ?? "";

        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
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

        if (userError) {
            return new Response(
                JSON.stringify({ error: userError.message || "Unauthorized" }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

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

            await supabaseAdmin.from("tenant_subscriptions").upsert({
                tenant_id: tenantId,
                stripe_customer_id: customerId,
            });
        }

        const stripeAny = stripe as unknown as any;
        const session = await stripeAny.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/dashboard`,
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
