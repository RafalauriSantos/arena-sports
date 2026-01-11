import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
	const supabase = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
	);

	try {
		const body = await req.json();
		const { event, payment } = body;

		console.log(`Evento recebido Asaas: ${event}`);
		// Só nos interessa quando o dinheiro cai
		if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
			const subscriptionId = payment.subscription;

			if (!subscriptionId) {
				return new Response(
					JSON.stringify({
						message: "Ignorado: Pagamento sem assinatura vinculada",
					}),
					{ status: 200 }
				);
			}
			// Atualiza o banco para liberar o acesso
			const { error } = await supabase
				.from("tenant_subscriptions")
				.update({
					status: "active",
					updated_at: new Date().toISOString(),
				})
				.eq("asaas_subscription_id", subscriptionId);
			if (error) {
				console.error("Erro ao atualizar banco:", error);
				throw error;
			}

			console.log(`Sucesso: Assinatura ${subscriptionId} ativada!`);
		}
		return new Response(JSON.stringify({ received: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error(error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}
});
