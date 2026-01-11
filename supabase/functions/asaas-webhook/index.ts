import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
	// Cria cliente ADMIN (Service Role) para ter permissão total de escrita
	const supabaseAdmin = createClient(
		Deno.env.get('SUPABASE_URL') ?? '',
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
	)

	try {
		const body = await req.json()

		// LOG DE OURO: Mostra tudo que o Asaas mandou
		console.log("📦 JSON COMPLETO DO ASAAS:", JSON.stringify(body))

		const event = body.event
		const payment = body.payment

		console.log(`🔔 Evento identificado: ${event}`)

		// Verifica se é confirmação de pagamento
		if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {

			// Tenta pegar o ID da assinatura
			const subscriptionId = payment?.subscription

			if (!subscriptionId) {
				console.log("⚠️ Pagamento recebido, mas não tem 'subscription' vinculado. É pagamento avulso?")
				return new Response(JSON.stringify({ message: 'Ignorado: Sem subscription ID' }), { status: 200 })
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
				// Retorna 200 pro Asaas parar de tentar, mas loga o erro pra nós
				return new Response(JSON.stringify({ error: 'Assinatura não encontrada no banco' }), { status: 200 })
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

		return new Response(JSON.stringify({ received: true }), {
			headers: { "Content-Type": "application/json" }
		})

	} catch (error) {
		console.error("💥 Erro fatal na função:", error)
		return new Response(JSON.stringify({ error: error.message }), { status: 500 })
	}
})
