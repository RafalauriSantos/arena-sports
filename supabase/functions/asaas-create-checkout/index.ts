// Supabase Edge Function: asaas-create-checkout
// Creates an Asaas Checkout for the requested plan and returns the redirect URL.

// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

type PlanCode = "start" | "pro";
type Interval = "month" | "year";

type Body = {
    plan_code?: PlanCode;
    interval?: Interval;
};

const planDefaults: Record<PlanCode, { name: string; values: Record<Interval, number> }> = {
    start: {
        name: "Arena Start",
        values: {
            month: 149,
            year: 1788,
        },
    },
    pro: {
        name: "Arena Pro",
        values: {
            month: 249,
            year: 1164,
        },
    },
};

const asaasBaseUrl = (Deno.env.get("ASAAS_BASE_URL") ?? "https://www.asaas.com/api/v3").replace(/\/+$/, "");
const asaasAccessToken = Deno.env.get("ASAAS_ACCESS_TOKEN");
const asaasUserAgent = Deno.env.get("ASAAS_USER_AGENT") ?? "arena-sports-asaas/1.0";

function parseEnvNumber(key: string, fallback: number): number {
    const raw = Deno.env.get(key);
    if (!raw) return fallback;
    const normalized = raw.replace(",", ".").trim();
    if (!normalized) return fallback;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getPlanAmount(planCode: PlanCode, interval: Interval): number {
    const envKey = `ASAAS_PLAN_${planCode.toUpperCase()}_${interval === "month" ? "MONTHLY" : "YEARLY"}_VALUE`;
    const fallback = planDefaults[planCode].values[interval];
    return parseEnvNumber(envKey, fallback);
}

function getMonthlyPrice(planCode: PlanCode, interval: Interval): number {
    if (planCode === "pro") {
        return interval === "year" ? 97 : 249;
    }
    return 149;
}

function getPlanName(planCode: PlanCode): string {
    return planCode === "pro" ? "Arena Pro" : "Arena Start";
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

async function callAsaas(endpoint: string, method: string, body?: Record<string, unknown>) {
    if (!asaasAccessToken) {
        throw new Error("Missing ASAAS_ACCESS_TOKEN");
    }
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        access_token: asaasAccessToken,
        "User-Agent": asaasUserAgent,
    };
    const response = await fetch(`${asaasBaseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    let payload: Record<string, unknown> = {};
    try {
        payload = (await response.json()) as Record<string, unknown>;
    } catch {
        payload = {};
    }
    if (!response.ok) {
        const message = (payload?.message as string) ?? JSON.stringify(payload) ?? response.statusText;
        throw new Error(`${method} ${endpoint} failed: ${response.status} ${message}`);
    }
    return payload;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
            throw new Error("Missing Supabase env (URL/ANON/SERVICE_ROLE)");
        }
        if (!asaasAccessToken) {
            throw new Error("Missing ASAAS_ACCESS_TOKEN");
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader.toLowerCase().startsWith("bearer ")) {
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

        if (userError || !user) {
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

        const planCodeRaw = body.plan_code;
        if (planCodeRaw !== "start" && planCodeRaw !== "pro") {
            return new Response(
                JSON.stringify({ error: "plan_code inválido. Use start ou pro." }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
        const intervalRaw = body.interval;
        if (intervalRaw !== "month" && intervalRaw !== "year") {
            return new Response(
                JSON.stringify({ error: "interval inválido. Use month ou year." }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
        const planCode: PlanCode = planCodeRaw;
        const interval: Interval = intervalRaw;

        const { data: profiles, error: profileError } = await supabaseAuth
            .from("profiles")
            .select("tenant_id, full_name, updated_at, created_at")
            .eq("id", user.id)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1);

        if (profileError) throw profileError;
        const profile = profiles?.[0];
        const tenantId = profile?.tenant_id ?? null;
        if (!tenantId) {
            return new Response(
                JSON.stringify({
                    error:
                        "Seu perfil precisa de um tenant_id. Complete o onboarding (logout/login) e tente novamente.",
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
            .select("asaas_customer_id")
            .eq("tenant_id", tenantId)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1);

        if (subError) throw subError;
        let customerId = subs?.[0]?.asaas_customer_id ?? null;

        if (!customerId) {
            const customerBody: Record<string, unknown> = {
                externalReference: tenantId,
            };
            if (profile?.full_name) {
                customerBody.name = profile.full_name;
            } else if (user.email) {
                customerBody.name = user.email;
            }
            if (user.email) {
                customerBody.email = user.email;
            }

            const customer = await callAsaas("/customers", "POST", customerBody);
            customerId = String(customer["id"] ?? "");
            if (!customerId) {
                throw new Error("Asaas customer response missing id");
            }

            await supabaseAdmin.from("tenant_subscriptions").upsert({
                tenant_id: tenantId,
                asaas_customer_id: customerId,
            });
        }

        const planAmount = getPlanAmount(planCode, interval);
        const planName = getPlanName(planCode);
        const origin = getRequestOrigin(req);
        if (!origin) {
            return new Response(
                JSON.stringify({
                    error:
                        "Não foi possível determinar a origem. Abra o app a partir do site correto.",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const planQuery = `plan=${planCode}&interval=${interval}`;
        const callbackBase = `${origin}/dashboard`;
        const callback = {
            successUrl: `${callbackBase}?asaas=success&${planQuery}`,
            cancelUrl: `${callbackBase}?asaas=cancel&${planQuery}`,
            expiredUrl: `${callbackBase}?asaas=expired&${planQuery}`,
        };

        const customerData: Record<string, unknown> = {};
        if (profile?.full_name) {
            customerData.name = profile.full_name;
        }
        if (user.email) {
            customerData.email = user.email;
        }

        const checkoutBody: Record<string, unknown> = {
            billingType: "CREDIT_CARD",
            chargeTypes: ["RECURRENT"],
            customer: customerId,
            description: planCode,
            callback,
            subscription: {
                cycle: interval === "year" ? "YEARLY" : "MONTHLY",
                value: planAmount,
                description: planCode,
            },
            items: [
                {
                    name: planName,
                    description: planCode,
                    quantity: 1,
                    value: planAmount,
                },
            ],
            externalReference: tenantId,
        };

        if (Object.keys(customerData).length > 0) {
            checkoutBody.customerData = customerData;
        }

        const checkout = await callAsaas("/checkouts", "POST", checkoutBody);
        const checkoutUrl =
            String(checkout["link"] ?? checkout["url"] ?? checkout["paymentLink"] ?? "");

        if (!checkoutUrl) {
            throw new Error("Asaas checkout response missing URL");
        }

        await supabaseAdmin.from("tenant_subscriptions").upsert({
            tenant_id: tenantId,
            plan_code: planCode,
            plan_name: planName,
            billing_interval: interval,
            monthly_price: getMonthlyPrice(planCode, interval),
            asaas_customer_id: customerId,
            asaas_checkout_id: checkout["id"],
        });

        return new Response(JSON.stringify({ url: checkoutUrl }), {
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