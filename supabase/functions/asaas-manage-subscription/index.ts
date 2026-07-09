// Supabase Edge Function: asaas-manage-subscription
// Gerencia assinaturas ASAAS: cancelar, reativar, trocar plano
// Implementação robusta com validações, logs e tratamento de erros

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import {
    assertAsaasEnvironment,
    resolveAsaasApiUrl,
} from "../_shared/asaas-env.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
    createRequestContext,
    errorMessage,
    jsonResponse,
    logEvent,
    withLogFields,
    type RequestLogContext,
} from "../_shared/observability.ts";

const FUNCTION_NAME = "asaas-manage-subscription";

type Action = "cancel" | "reactivate" | "change_plan";

type Body = {
    action: Action;
    plan_code?: "start" | "pro"; // Obrigatório para change_plan
    interval?: "month" | "year"; // Obrigatório para change_plan
};

const ASAAS_BASE_URL = resolveAsaasApiUrl();

const ASAAS_TOKEN =
    Deno.env.get("ASAAS_API_KEY") ?? Deno.env.get("ASAAS_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Validações de ambiente
if (!ASAAS_TOKEN) {
    throw new Error("ASAAS_ACCESS_TOKEN é obrigatório");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
}

// Oferta comercial atual
const OFFER_PRICE = {
    month: 69.9,
    year: 597,
    founderYear: 397,
} as const;

const PLANS = {
    start: {
        name: "ArenaSys",
        prices: {
            month: OFFER_PRICE.month,
            year: OFFER_PRICE.year,
        },
    },
    pro: {
        name: "ArenaSys",
        prices: {
            month: OFFER_PRICE.month,
            year: OFFER_PRICE.year,
        },
    },
} as const;

const FOUNDERS_CAP = 20; // Apenas 20 primeiros clientes

async function asaasRequest(
    context: RequestLogContext,
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>
) {
    const url = `${ASAAS_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
        "access_token": ASAAS_TOKEN!,
        "Content-Type": "application/json",
    };

    const options: RequestInit = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    logEvent(context, "info", "asaas_api_request_started", {
        method,
        endpoint,
        has_body: Boolean(body),
    });

    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        logEvent(context, "error", "asaas_api_request_failed", {
            method,
            endpoint,
            status: response.status,
            response_body: errorText,
        });
        throw new Error(`ASAAS API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

Deno.serve(async (req) => {
    let logContext = createRequestContext(FUNCTION_NAME, req);

    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        logEvent(logContext, "info", "request_started", {
            method: req.method,
        });

        // ─────────────────────────────────────────────
        // 1. Validação de método e autenticação
        // ─────────────────────────────────────────────
        if (req.method !== "POST") {
            logEvent(logContext, "warn", "method_not_allowed", {
                method: req.method,
            });
            return jsonResponse(
                { error: "Método não permitido. Use POST." },
                405,
                logContext,
                corsHeaders
            );
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            logEvent(logContext, "warn", "auth_failed", {
                reason: "missing_bearer",
            });
            return jsonResponse(
                { error: "Token de autenticação não fornecido" },
                401,
                logContext,
                corsHeaders
            );
        }

        const accessToken = authHeader.replace("Bearer ", "");

        const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
            auth: { persistSession: false },
        });

        // Validar token do usuário
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

        if (authError || !user) {
            logEvent(logContext, "warn", "auth_failed", {
                reason: "invalid_token",
                error: authError,
            });
            return jsonResponse(
                { error: "Token inválido ou expirado" },
                401,
                logContext,
                corsHeaders
            );
        }
        logContext = withLogFields(logContext, { user_id: user.id });
        assertAsaasEnvironment(ASAAS_BASE_URL, ASAAS_TOKEN);

        // ─────────────────────────────────────────────
        // 2. Resolver tenant do usuário
        // ─────────────────────────────────────────────
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.tenant_id) {
            logEvent(logContext, "error", "profile_lookup_failed", {
                error: profileError,
            });
            return jsonResponse(
                { error: "Perfil ou tenant não encontrado" },
                404,
                logContext,
                corsHeaders
            );
        }
        logContext = withLogFields(logContext, { tenant_id: profile.tenant_id });

        // ─────────────────────────────────────────────
        // 3. Buscar assinatura atual
        // ─────────────────────────────────────────────
        const { data: subscription, error: subError } = await supabaseAdmin
            .from("tenant_subscriptions")
            .select("*")
            .eq("tenant_id", profile.tenant_id)
            .maybeSingle();

        if (subError) {
            logEvent(logContext, "error", "subscription_lookup_failed", {
                error: subError,
            });
            return jsonResponse(
                { error: "Erro ao buscar assinatura" },
                500,
                logContext,
                corsHeaders
            );
        }

        if (!subscription) {
            logEvent(logContext, "warn", "subscription_not_found");
            return jsonResponse(
                { error: "Assinatura não encontrada" },
                404,
                logContext,
                corsHeaders
            );
        }
        logContext = withLogFields(logContext, {
            subscription_id: subscription.asaas_subscription_id ?? null,
        });

        if (!subscription.asaas_subscription_id) {
            logEvent(logContext, "warn", "subscription_missing_provider_id", {
                subscription_status: subscription.status,
            });
            return jsonResponse(
                {
                    error: "Assinatura não possui ID do ASAAS. Não é possível gerenciar.",
                    subscription_status: subscription.status
                },
                400,
                logContext,
                corsHeaders
            );
        }

        // ─────────────────────────────────────────────
        // 4. Parse do body e validação
        // ─────────────────────────────────────────────
        const body: Body = await req.json();

        if (!body.action) {
            logEvent(logContext, "warn", "request_validation_failed", {
                reason: "missing_action",
            });
            return jsonResponse(
                { error: "Campo 'action' é obrigatório (cancel | reactivate | change_plan)" },
                400,
                logContext,
                corsHeaders
            );
        }

        // ─────────────────────────────────────────────
        // 5. Executar ação
        // ─────────────────────────────────────────────
        let result;

        switch (body.action) {
            case "cancel":
                // Cancelar assinatura no ASAAS
                result = await asaasRequest(
                    logContext,
                    `/subscriptions/${subscription.asaas_subscription_id}`,
                    "DELETE"
                );

                // Atualizar status local para cancelled
                const { error: cancellationUpdateError } = await supabaseAdmin
                    .from("tenant_subscriptions")
                    .update({
                        status: "cancelled",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("tenant_id", profile.tenant_id);

                if (cancellationUpdateError) {
                    logEvent(logContext, "error", "subscription_local_update_failed", {
                        action: "cancel",
                        error: cancellationUpdateError,
                    });
                    return jsonResponse(
                        {
                            error: "Assinatura cancelada no Asaas, mas o status local precisa ser reconciliado.",
                            code: "LOCAL_SUBSCRIPTION_UPDATE_FAILED",
                        },
                        502,
                        logContext,
                        corsHeaders
                    );
                }

                logEvent(logContext, "info", "subscription_cancelled", {
                    action: "cancel",
                });

                return jsonResponse(
                    {
                        success: true,
                        action: "cancel",
                        message: "Assinatura cancelada com sucesso",
                        subscription_id: subscription.asaas_subscription_id,
                    },
                    200,
                    logContext,
                    corsHeaders
                );

            case "reactivate":
                // Reativar assinatura no ASAAS (se suportado)
                // Nota: ASAAS pode não ter API direta para reativar, pode precisar criar nova assinatura
                // Por enquanto, vamos tentar atualizar status manualmente e criar nova se necessário

                if (subscription.status === "cancelled") {
                    // Criar nova assinatura (checkout seria melhor, mas por simplicidade atualizamos)
                    // Em produção, pode ser melhor redirecionar para checkout novamente
                    logEvent(logContext, "warn", "subscription_reactivate_unsupported", {
                        subscription_status: subscription.status,
                    });
                    return jsonResponse(
                        {
                            error: "Assinatura cancelada não pode ser reativada automaticamente. Por favor, crie uma nova assinatura.",
                            suggestion: "Use a função asaas-create-checkout para criar nova assinatura",
                        },
                        400,
                        logContext,
                        corsHeaders
                    );
                }

                if (subscription.status === "past_due") {
                    return jsonResponse(
                        {
                            error: "Pagamento pendente não pode ser reativado manualmente. Regularize a cobrança no Asaas e aguarde a confirmação.",
                        },
                        409,
                        logContext,
                        corsHeaders
                    );
                }

                await asaasRequest(
                    logContext,
                    `/subscriptions/${subscription.asaas_subscription_id}`,
                    "PUT",
                    { status: "ACTIVE" }
                );

                await supabaseAdmin
                    .from("tenant_subscriptions")
                    .update({
                        status: "active",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("tenant_id", profile.tenant_id);

                logEvent(logContext, "info", "subscription_reactivated", {
                    action: "reactivate",
                });

                return jsonResponse(
                    {
                        success: true,
                        action: "reactivate",
                        message: "Assinatura reativada (pode precisar de pagamento pendente)",
                    },
                    200,
                    logContext,
                    corsHeaders
                );

            case "change_plan":
                // Validar plan_code e interval
                if (!body.plan_code || !body.interval) {
                    logEvent(logContext, "warn", "request_validation_failed", {
                        reason: "missing_plan_code_or_interval",
                        action: body.action,
                    });
                    return jsonResponse(
                        {
                            error: "Para trocar plano, 'plan_code' e 'interval' são obrigatórios"
                        },
                        400,
                        logContext,
                        corsHeaders
                    );
                }

                if (!(body.plan_code in PLANS)) {
                    logEvent(logContext, "warn", "request_validation_failed", {
                        reason: "invalid_plan_code",
                        plan_code: body.plan_code,
                    });
                    return jsonResponse(
                        { error: "Plan code inválido. Use 'start' ou 'pro'" },
                        400,
                        logContext,
                        corsHeaders
                    );
                }

                const plan = PLANS[body.plan_code];
                const value = plan.prices[body.interval];
                const description = `${plan.name} - ${body.interval === "year" ? "Anual" : "Mensal"}`;

                await asaasRequest(
                    logContext,
                    `/subscriptions/${subscription.asaas_subscription_id}`,
                    "PUT",
                    {
                        value,
                        cycle: body.interval === "year" ? "YEARLY" : "MONTHLY",
                        description,
                        updatePendingPayments: true,
                    }
                );

                const { error: planUpdateError } = await supabaseAdmin
                    .from("tenant_subscriptions")
                    .update({
                        plan_code: body.plan_code,
                        plan_name: plan.name,
                        monthly_price: Math.round(
                            (body.interval === "year" ? value / 12 : value) * 100
                        ),
                        billing_interval: body.interval,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("tenant_id", profile.tenant_id);

                if (planUpdateError) {
                    logEvent(logContext, "error", "subscription_local_update_failed", {
                        action: "change_plan",
                        error: planUpdateError,
                    });
                    return jsonResponse(
                        {
                            error: "Plano atualizado no Asaas, mas o status local precisa ser reconciliado.",
                            code: "LOCAL_SUBSCRIPTION_UPDATE_FAILED",
                        },
                        502,
                        logContext,
                        corsHeaders
                    );
                }

                logEvent(logContext, "info", "subscription_plan_changed", {
                    action: "change_plan",
                    plan_code: body.plan_code,
                    billing_interval: body.interval,
                });

                return jsonResponse(
                    {
                        success: true,
                        action: "change_plan",
                        message: "Plano alterado. Próximo ciclo será cobrado com novo plano.",
                        new_plan: {
                            code: body.plan_code,
                            name: plan.name,
                            interval: body.interval,
                            price: value,
                        },
                        note: "Para aplicar imediatamente, pode ser necessário cancelar e criar nova assinatura via checkout",
                    },
                    200,
                    logContext,
                    corsHeaders
                );

            default:
                logEvent(logContext, "warn", "request_validation_failed", {
                    reason: "unknown_action",
                    action: body.action,
                });
                return jsonResponse(
                    {
                        error: `Ação '${body.action}' não reconhecida. Use: cancel, reactivate, change_plan`
                    },
                    400,
                    logContext,
                    corsHeaders
                );
        }

    } catch (error: unknown) {
        const message = errorMessage(error);
        logEvent(logContext, "error", "unexpected_error", {
            error,
            error_message: message,
        });

        return jsonResponse(
            {
                error: "Erro ao gerenciar assinatura",
                details: message
            },
            500,
            logContext,
            corsHeaders
        );
    }
});
