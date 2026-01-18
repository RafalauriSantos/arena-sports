// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const ASAAS_WEBHOOK_TOKEN =
	Deno.env.get("ASAAS_WEBHOOK_SECRET") ?? Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? ""

serve(async (req) => {
	let eventId: string | null = null
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders })
	}

	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		})
	}

	// Cria cliente ADMIN (Service Role) para ter permissão total de escrita
	const supabaseAdmin = createClient(
		Deno.env.get('SUPABASE_URL') ?? '',
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
	)

	try {
		if (ASAAS_WEBHOOK_TOKEN) {
			const token = req.headers.get("asaas-access-token")
			if (!token || token !== ASAAS_WEBHOOK_TOKEN) {
				console.error("❌ Token de webhook inválido ou ausente")
				return new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				})
			}
		} else {
			console.warn("⚠️ ASAAS_WEBHOOK_TOKEN/SECRET não configurado. Webhook sem validação.")
		}

		const body = await req.json()

		// LOG DE OURO: Mostra tudo que o Asaas mandou
		console.log("📦 JSON COMPLETO DO ASAAS:", JSON.stringify(body))

		eventId =
			body?.id ||
			body?.payment?.id ||
			body?.subscription?.id ||
			crypto.randomUUID()

		// Idempotência: registrar evento
		const { error: insertEventError } = await supabaseAdmin
			.from("asaas_webhook_events")
			.insert({
				event_id: eventId,
				payload: body,
				status: "processing"
			})

		if (insertEventError) {
			if (insertEventError.code === "23505") {
				console.log(`ℹ️ Evento ${eventId} já processado. Ignorando.`)
				return new Response(JSON.stringify({ received: true, duplicate: true }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				})
			}
			throw insertEventError
		}

		const event = body.event
		const payment = body.payment

		console.log(`🔔 Evento identificado: ${event}`)

		// Verifica se é confirmação de pagamento
		if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {

			// Tenta pegar o ID da assinatura
			const subscriptionId = payment?.subscription

			if (!subscriptionId) {
				console.log("⚠️ Pagamento recebido, mas não tem 'subscription' vinculado. É pagamento avulso?")
				await supabaseAdmin
					.from("asaas_webhook_events")
					.update({ status: "failed", processed_at: new Date().toISOString() })
					.eq("event_id", eventId)
				return new Response(JSON.stringify({ message: 'Ignorado: Sem subscription ID' }), {
					status: 200,
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				})
			}

			console.log(`🔎 Buscando no banco pelo asaas_subscription_id: ${subscriptionId}`)

			// Busca a assinatura
			const { data: subscription, error: searchError } = await supabaseAdmin
				.from('tenant_subscriptions')
				.select('*')
				.eq('asaas_subscription_id', subscriptionId)
				.maybeSingle()

			if (searchError) {
				console.error('❌ Erro ao buscar assinatura:', searchError)
				throw searchError
			}

			if (!subscription) {
				console.error(`❌ Assinatura ${subscriptionId} não encontrada no banco!`)
				await supabaseAdmin
					.from("asaas_webhook_events")
					.update({ status: "failed", processed_at: new Date().toISOString() })
					.eq("event_id", eventId)
				// Retorna 200 pro Asaas parar de tentar, mas loga o erro pra nós
				return new Response(JSON.stringify({ error: 'Assinatura não encontrada no banco' }), {
					status: 200,
					headers: { ...corsHeaders, "Content-Type": "application/json" }
				})
			}

			console.log(`✅ Assinatura encontrada! Atualizando tenant ${subscription.tenant_id}...`)

			// Atualiza para ATIVO
			const { error: updateError } = await supabaseAdmin
				.from('tenant_subscriptions')
				.update({
					status: 'active',
					updated_at: new Date().toISOString()
				})
				.eq('asaas_subscription_id', subscriptionId)

			if (updateError) {
				console.error('❌ Erro ao atualizar status:', updateError)
				throw updateError
			}

			console.log(`🚀 SUCESSO! Assinatura ${subscriptionId} ativada.`)
		} else {
			console.log(`ℹ️ Evento ignorado (não é confirmação de pagamento): ${event}`)
		}

		await supabaseAdmin
			.from("asaas_webhook_events")
			.update({ status: "done", processed_at: new Date().toISOString() })
			.eq("event_id", eventId)

		return new Response(JSON.stringify({ received: true }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		})

	} catch (error) {
		console.error("💥 Erro fatal na função:", error)
		if (eventId) {
			await supabaseAdmin
				.from("asaas_webhook_events")
				.update({ status: "failed", processed_at: new Date().toISOString() })
				.eq("event_id", eventId)
		}
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" }
		})
	}
})
