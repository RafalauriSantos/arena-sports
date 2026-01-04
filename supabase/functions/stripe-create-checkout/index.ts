// Supabase Edge Function: stripe-create-checkout
// Creates a Stripe Checkout Session for subscriptions.

// @ts-nocheck

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

type Interval = "month" | "year";

type Body = {
    plan_code: "start" | "pro";
    interval: Interval;
};

function getEnvFirst(keys: string[]) {
    for (const key of keys) {
        const value = Deno.env.get(key);
        if (value) return { key, value };
    }
    return null;
}

function getPriceId(planCode: Body["plan_code"], interval: Interval) {
    const keys =
        planCode === "start"
            ? interval === "month"
                ? [
                    "STRIPE_PRICE_START_MONTH",
                    "STRIPE_PRICE_START_MONTHLY",
                    "VITE_STRIPE_PRICE_START_MONTHLY",
                ]
                : [
                    "STRIPE_PRICE_START_YEAR",
                    "STRIPE_PRICE_START_YEARLY",
                    "VITE_STRIPE_PRICE_START_YEARLY",
                ]
            : interval === "month"
                ? [
                    "STRIPE_PRICE_PRO_MONTH",
                    "STRIPE_PRICE_PRO_MONTHLY",
                    "VITE_STRIPE_PRICE_PRO_MONTHLY",
                ]
                : [
                    "STRIPE_PRICE_PRO_YEAR",
                    "STRIPE_PRICE_PRO_YEARLY",
                    "VITE_STRIPE_PRICE_PRO_YEARLY",
                ];

    const found = getEnvFirst(keys);
    if (!found) {
        throw new Error(`Missing Stripe price env. Tried: ${keys.join(", ")}`);
    }

    return found.value;
}

function getRequestOrigin(req: Request): string | null {
    const originHeader = req.headers.get("origin");
    if (originHeader && originHeader.trim()) return originHeader.trim();

    const referer = req.headers.get("referer");
    if (referer && referer.trim()) {
        try {
            return new URL(referer).origin;
        } catch {
            // ignore
        }
    }

    const siteUrl = Deno.env.get("SITE_URL");
    if (siteUrl && siteUrl.trim()) return siteUrl.trim();

    return null;
}

function formatUnknownError(err: unknown): string {
    if (err == null) return "Unknown error";
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (typeof err === "object") {
        const anyErr = err as Record<string, unknown>;
        const message = anyErr["message"];
        if (typeof message === "string" && message) return message;
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }
    return String(err);
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
        // NOTE: Avoid `.single()`/`.maybeSingle()` here because PostgREST can throw
        // "JSON object requested, multiple (or no) rows returned" if the profile row
        // doesn't exist (or if duplicates somehow exist). We just need one row.
        const { data: profiles, error: profileError } = await supabaseAuth
            .from("profiles")
            .select("tenant_id, updated_at, created_at")
            .eq("id", user.id)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1);

        if (profileError) throw profileError;
        const tenantId = profiles?.[0]?.tenant_id;
        if (!tenantId) {
            return new Response(
                JSON.stringify({
                    error:
                        "Perfil do usuário não encontrado (profiles) ou sem tenant_id. Faça logout/login e tente novamente.",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: subs, error: subError } = await supabaseAdmin
            .from("tenant_subscriptions")
            .select("stripe_customer_id, updated_at, created_at")
            .eq("tenant_id", tenantId)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1);

        if (subError) throw subError;

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
        });

        let customerId = subs?.[0]?.stripe_customer_id ?? null;
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

        const origin = getRequestOrigin(req);
        if (!origin) {
            return new Response(
                JSON.stringify({
                    error:
                        "Missing Origin/Referer. Abra o checkout a partir do app (navegador) para gerar URLs de retorno.",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
        const successUrl = `${origin}/dashboard?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/dashboard?stripe=cancel`;

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
        const message = formatUnknownError(err);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
