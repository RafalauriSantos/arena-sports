// Supabase Edge Function: asaas-webhook
// Recebe eventos de webhook do Asaas e sincroniza assinaturas
// Implementação robusta com idempotência, validação de segurança e logs

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Validações de ambiente
if (!ASAAS_WEBHOOK_TOKEN) {
    throw new Error("ASAAS_WEBHOOK_TOKEN é obrigatório");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
}

type AsaasWebhookEvent = {
    id: string;
    event: string;
    payment?: {
        id: string;
        customer: string;
        subscription?: string;
        value: number;
        netValue: number;
        status: string;
        billingType: string;
        dateCreated: string;
        paymentDate?: string;
        description: string;
        externalReference?: string;
    };
    subscription?: {
        id: string;
        customer: string;
        status: string;
        dateCreated: string;
        nextDueDate?: string;
        cycle: string;
        value: number;
        description: string;
        externalReference?: string;
    };
};

// Mapeamento de status Asaas para nosso sistema
function mapAsaasPaymentStatus(status: string): "pending" | "paid" | "failed" | "canceled" {
    const normalized = status.toUpperCase();
    switch (normalized) {
        case "PENDING":
        case "AWAITING_RISK_ANALYSIS":
            return "pending";
        case "RECEIVED":
        case "CONFIRMED":
        case "PAYMENT_RECEIVED":
            return "paid";
        case "OVERDUE":
        case "REFUSED":
        case "CHARGEBACK_REQUESTED":
        case "CHARGEBACK_DISPUTE":
        case "AWAITING_CHARGEBACK_REVERSAL":
        case "DUNNING_REQUESTED":
        case "DUNNING_RECEIVED":
        case "AWAITING_RISK_ANALYSIS":
            return "failed";
        case "DELETED":
        case "CANCELLED":
            return "canceled";
        default:
            console.warn(`[WEBHOOK] Status desconhecido: ${status}`);
            return "pending";
    }
}

function mapAsaasSubscriptionStatus(status: string): "active" | "past_due" | "canceled" {
    const normalized = status.toUpperCase();
    switch (normalized) {
        case "ACTIVE":
            return "active";
        case "OVERDUE":
        case "EXPIRED":
            return "past_due";
        case "INACTIVE":
        case "DELETED":
            return "canceled";
        default:
            console.warn(`[WEBHOOK] Subscription status desconhecido: ${status}`);
            return "canceled";
    }
}

// Processa evento de pagamento
async function processPaymentEvent(event: AsaasWebhookEvent, supabase: any) {
    if (!event.payment) {
        console.warn("[WEBHOOK] Evento PAYMENT sem dados de pagamento");
        return;
    }

    const payment = event.payment;
    const status = mapAsaasPaymentStatus(payment.status);

    console.log(`[WEBHOOK] Processando pagamento ${payment.id}: ${status}`);

    // Buscar tenant pelo customer ID
    const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("tenant_id, plan_code, billing_interval")
        .eq("asaas_customer_id", payment.customer)
        .single();

    if (!subscription) {
        console.warn(`[WEBHOOK] Customer ${payment.customer} não encontrado`);
        return;
    }

    // Atualizar status da assinatura baseado no pagamento
    if (status === "paid") {
        await supabase
            .from("tenant_subscriptions")
            .update({
                status: "active",
                asaas_payment_id: payment.id,
                last_payment_date: payment.paymentDate || new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", subscription.tenant_id);
    } else if (status === "failed") {
        await supabase
            .from("tenant_subscriptions")
            .update({
                status: "past_due",
                asaas_payment_id: payment.id,
                updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", subscription.tenant_id);
    }

    console.log(`[WEBHOOK] Pagamento ${payment.id} processado para tenant ${subscription.tenant_id}`);
}

// Processa evento de assinatura
async function processSubscriptionEvent(event: AsaasWebhookEvent, supabase: any) {
    if (!event.subscription) {
        console.warn("[WEBHOOK] Evento SUBSCRIPTION sem dados de assinatura");
        return;
    }

    const subscription = event.subscription;
    const status = mapAsaasSubscriptionStatus(subscription.status);

    console.log(`[WEBHOOK] Processando assinatura ${subscription.id}: ${status}`);

    // Atualizar status da assinatura
    await supabase
        .from("tenant_subscriptions")
        .update({
            status,
            asaas_subscription_id: subscription.id,
            next_due_date: subscription.nextDueDate,
            updated_at: new Date().toISOString(),
        })
        .eq("asaas_customer_id", subscription.customer);

    console.log(`[WEBHOOK] Assinatura ${subscription.id} atualizada para status ${status}`);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: corsHeaders,
        });
    }

    try {
        // ─────────────────────────────────────────────
        // 1. Validação de Segurança (CRÍTICO)
        // ─────────────────────────────────────────────
        const asaasToken = req.headers.get("asaas-access-token");
        if (!asaasToken || asaasToken !== ASAAS_WEBHOOK_TOKEN) {
            console.error("[WEBHOOK SECURITY] Token inválido ou ausente");
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: corsHeaders,
            });
        }

        // ─────────────────────────────────────────────
        // 2. Parse do Body
        // ─────────────────────────────────────────────
        const event: AsaasWebhookEvent = await req.json();

        if (!event.id || !event.event) {
            console.error("[WEBHOOK] Evento malformado:", event);
            return new Response(JSON.stringify({ error: "Invalid event format" }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        console.log(`[WEBHOOK] Recebido evento: ${event.event} (ID: ${event.id})`);

        // ─────────────────────────────────────────────
        // 3. Idempotência (Evitar duplicatas)
        // ─────────────────────────────────────────────
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Verificar se evento já foi processado
        const { data: existingEvent } = await supabase
            .from("webhook_events")
            .select("id")
            .eq("event_id", event.id)
            .single();

        if (existingEvent) {
            console.log(`[WEBHOOK] Evento ${event.id} já processado, ignorando`);
            return new Response(JSON.stringify({ success: true, duplicate: true }), {
                headers: corsHeaders,
            });
        }

        // Registrar evento como processado
        await supabase
            .from("webhook_events")
            .insert({
                event_id: event.id,
                event_type: event.event,
                payload: event,
                processed_at: new Date().toISOString(),
            });

        // ─────────────────────────────────────────────
        // 4. Processamento por Tipo de Evento
        // ─────────────────────────────────────────────
        const eventType = event.event.toUpperCase();

        if (eventType.startsWith("PAYMENT_")) {
            await processPaymentEvent(event, supabase);
        } else if (eventType.startsWith("SUBSCRIPTION_")) {
            await processSubscriptionEvent(event, supabase);
        } else {
            console.log(`[WEBHOOK] Evento ${eventType} não processado (não relevante)`);
        }

        // ─────────────────────────────────────────────
        // 5. Resposta de Sucesso (CRÍTICO)
        // ─────────────────────────────────────────────
        console.log(`[WEBHOOK] Evento ${event.id} processado com sucesso`);
        return new Response(JSON.stringify({ success: true }), {
            headers: corsHeaders,
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro interno";
        console.error("[WEBHOOK ERROR]:", errorMessage);

        // Mesmo em erro, retornar 200 para não pausar a fila do Asaas
        // O Asaas considera qualquer resposta 2xx como sucesso
        return new Response(JSON.stringify({ success: false, error: errorMessage }), {
            status: 200, // IMPORTANTE: Sempre 200 para não pausar fila
            headers: corsHeaders,
        });
    }
});