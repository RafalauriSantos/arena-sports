// Supabase Edge Function: asaas-create-checkout
// Padrão Asaas oficial para SaaS - Checkout-first approach
// Implementação robusta com validações, logs e tratamento de erros

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

type PlanCode = "start" | "pro";
type Interval = "month" | "year";

type Body = {
    plan_code?: PlanCode;
    interval?: Interval;
};

const PLANS = {
    start: {
        name: "Arena Start",
        prices: {
            month: 149,
            year: 1788,
        },
    },
    pro: {
        name: "Arena Pro",
        prices: {
            month: 249,
            year: 1164,
        },
    },
} as const;

const ASAAS_BASE_URL =
    (Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3").replace(
        /\/+$/,
        ""
    );

const ASAAS_TOKEN = Deno.env.get("ASAAS_ACCESS_TOKEN");
const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

// Validações de ambiente
if (!ASAAS_TOKEN) {
    throw new Error("ASAAS_ACCESS_TOKEN é obrigatório");
}

async function asaasRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>
) {
    const url = `${ASAAS_BASE_URL}${endpoint}`;

    console.log(`[ASAAS] ${method} ${url}`);

    const response = await fetch(url, {
        method,
        headers: new Headers({
            "Content-Type": "application/json",
            "access_token": ASAAS_TOKEN!,
            "User-Agent": "arena-sys-asaas/1.0",
        }),
        body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = responseData?.errors?.[0]?.description ||
            responseData?.message ||
            `HTTP ${response.status}: ${response.statusText}`;

        console.error(`[ASAAS ERROR] ${method} ${endpoint}:`, {
            status: response.status,
            error: errorMsg,
            requestBody: body,
            responseBody: responseData
        });

        throw new Error(`ASAAS ${method} ${endpoint} failed: ${response.status} ${errorMsg}`);
    }

    console.log(`[ASAAS SUCCESS] ${method} ${endpoint}:`, responseData);
    return responseData;
}

// Validação de CPF (algoritmo oficial brasileiro)
function isValidCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, "");

    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
        return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;

    return remainder === parseInt(cpf.charAt(10));
}

// Validação de telefone brasileiro
function isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/[^\d]/g, "");
    return cleaned.length >= 10 && cleaned.length <= 11;
}

// Validação de CEP brasileiro
function isValidPostalCode(postalCode: string): boolean {
    return /^\d{8}$/.test(postalCode.replace(/[^\d]/g, ""));
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // ─────────────────────────────────────────────
        // 1. Auth Supabase
        // ─────────────────────────────────────────────
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !anonKey || !serviceKey) {
            throw new Error("Supabase envs ausentes: URL, ANON_KEY, SERVICE_ROLE_KEY");
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized - Bearer token required" }), {
                status: 401,
                headers: corsHeaders,
            });
        }

        const supabaseAuth = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const {
            data: { user },
            error: authError,
        } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            console.error("[AUTH ERROR]:", authError);
            return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
                status: 401,
                headers: corsHeaders,
            });
        }

        // ─────────────────────────────────────────────
        // 2. Body validation
        // ─────────────────────────────────────────────
        const body = (await req.json().catch(() => ({}))) as Body;

        if (!body.plan_code || !PLANS[body.plan_code]) {
            return new Response(JSON.stringify({ error: "Plano inválido" }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        if (!body.interval || !["month", "year"].includes(body.interval)) {
            return new Response(JSON.stringify({ error: "Intervalo inválido - deve ser 'month' ou 'year'" }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        const plan = PLANS[body.plan_code];
        const value = plan.prices[body.interval];

        console.log(`[CHECKOUT REQUEST] User: ${user.id}, Plan: ${body.plan_code}, Interval: ${body.interval}, Value: ${value}`);

        // ─────────────────────────────────────────────
        // 3. Profile / Tenant
        // ─────────────────────────────────────────────
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);

        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("tenant_id, full_name, whatsapp")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            console.error("[PROFILE ERROR]:", profileError);
            throw new Error("Perfil não encontrado ou incompleto");
        }

        if (!profile.tenant_id) {
            throw new Error("Perfil incompleto: tenant_id não encontrado. Complete o onboarding.");
        }

        // ─────────────────────────────────────────────
        // 4. Get or Create Customer (ROBUST)
        // ─────────────────────────────────────────────
        let { data: subscription } = await supabaseAdmin
            .from("tenant_subscriptions")
            .select("asaas_customer_id")
            .eq("tenant_id", profile.tenant_id)
            .maybeSingle();

        let customerId = subscription?.asaas_customer_id;

        if (!customerId) {
            // Dados obrigatórios para assinaturas recorrentes no Asaas
            // TODO: Em produção, coletar esses dados do usuário durante onboarding
            const customerData = {
                name: profile.full_name || user.email || "Usuário",
                email: user.email,
                externalReference: profile.tenant_id,
                cpfCnpj: "52998224725", // CPF válido para teste
                phone: profile.whatsapp || "11987654321", // Usar whatsapp se disponível
                address: "Rua Teste",
                addressNumber: "123",
                postalCode: "01234567",
                province: "SP",
                city: "São Paulo",
            };

            console.log("[CUSTOMER CREATION] Criando customer Asaas:", customerData);

            const customer = await asaasRequest("/customers", "POST", customerData);
            customerId = customer.id;

            if (!customerId) {
                throw new Error("Falha ao criar customer: resposta sem ID");
            }

            await supabaseAdmin.from("tenant_subscriptions").upsert({
                tenant_id: profile.tenant_id,
                asaas_customer_id: customerId,
            });

            console.log(`[CUSTOMER CREATED] ID: ${customerId} for tenant: ${profile.tenant_id}`);
        }

        // ─────────────────────────────────────────────
        // 5. Create Checkout (PADRÃO ASAAS ATUAL)
        // ─────────────────────────────────────────────
        const baseUrl = "https://arenasys.com.br"; // Domínio de produção
        const planQuery = `plan=${body.plan_code}&interval=${body.interval}`;

        const checkoutData = {
            billingTypes: ["CREDIT_CARD"], // Apenas cartão para assinaturas recorrentes
            chargeTypes: ["RECURRENT"], // Apenas recorrente para assinaturas
            customer: customerId,
            description: `${plan.name} - ${body.interval === "year" ? "Anual" : "Mensal"}`,
            value,
            callback: {
                successUrl: `${baseUrl}/dashboard?asaas=success&${planQuery}`,
                cancelUrl: `${baseUrl}/dashboard?asaas=cancel&${planQuery}`,
                expiredUrl: `${baseUrl}/dashboard?asaas=expired&${planQuery}`,
            },
        };

        console.log("[CHECKOUT CREATION] Criando checkout Asaas:", checkoutData);

        const checkout = await asaasRequest("/checkouts", "POST", checkoutData);

        if (!checkout.invoiceUrl) {
            throw new Error("Checkout criado mas sem invoiceUrl");
        }

        // ─────────────────────────────────────────────
        // 6. Persist checkout info
        // ─────────────────────────────────────────────
        await supabaseAdmin.from("tenant_subscriptions").upsert({
            tenant_id: profile.tenant_id,
            plan_code: body.plan_code,
            billing_interval: body.interval,
            asaas_customer_id: customerId,
            status: "pending",
        });

        console.log(`[CHECKOUT SUCCESS] URL: ${checkout.invoiceUrl} for tenant: ${profile.tenant_id}`);

        // ─────────────────────────────────────────────
        // 7. Return checkout URL
        // ─────────────────────────────────────────────
        return new Response(
            JSON.stringify({
                checkoutUrl: checkout.invoiceUrl,
                plan: body.plan_code,
                interval: body.interval,
                value,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro interno do servidor";
        console.error("[CHECKOUT ERROR]:", errorMessage);

        return new Response(
            JSON.stringify({
                error: errorMessage,
            }),
            {
                status: 500,
                headers: corsHeaders,
            }
        );
    }
});