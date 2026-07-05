import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
	processAsaasWebhookEvent,
	type AsaasWebhookRepository,
	type TenantSubscriptionStatus,
} from "./webhook-core.ts";

const ASAAS_WEBHOOK_TOKEN =
	Deno.env.get("ASAAS_WEBHOOK_SECRET") ??
	Deno.env.get("ASAAS_WEBHOOK_TOKEN") ??
	"";

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

function createWebhookRepository(supabaseAdmin: any): AsaasWebhookRepository {
	return {
		async claimWebhookEvent(eventId: string, payload: unknown) {
			const { error: insertError } = await supabaseAdmin
				.from("asaas_webhook_events")
				.insert({
					event_id: eventId,
					payload,
					status: "processing",
				});

			if (!insertError) {
				return "claimed";
			}

			if (insertError.code !== "23505") {
				throw insertError;
			}

			const { data: existingEvent, error: selectError } = await supabaseAdmin
				.from("asaas_webhook_events")
				.select("status")
				.eq("event_id", eventId)
				.maybeSingle();

			if (selectError) {
				throw selectError;
			}

			if (existingEvent?.status !== "failed") {
				return "duplicate";
			}

			const { error: updateError } = await supabaseAdmin
				.from("asaas_webhook_events")
				.update({
					payload,
					status: "processing",
					processed_at: null,
				})
				.eq("event_id", eventId);

			if (updateError) {
				throw updateError;
			}

			return "claimed";
		},

		async markWebhookEventDone(eventId: string, processedAt: string) {
			const { error } = await supabaseAdmin
				.from("asaas_webhook_events")
				.update({ status: "done", processed_at: processedAt })
				.eq("event_id", eventId);

			if (error) {
				throw error;
			}
		},

		async markWebhookEventFailed(eventId: string, processedAt: string) {
			const { error } = await supabaseAdmin
				.from("asaas_webhook_events")
				.update({ status: "failed", processed_at: processedAt })
				.eq("event_id", eventId);

			if (error) {
				throw error;
			}
		},

		async findSubscriptionByAsaasId(subscriptionId: string) {
			const { data, error } = await supabaseAdmin
				.from("tenant_subscriptions")
				.select("tenant_id,status,asaas_subscription_id,updated_at")
				.eq("asaas_subscription_id", subscriptionId)
				.maybeSingle();

			if (error) {
				throw error;
			}

			return data;
		},

		async updateSubscriptionStatus(
			subscriptionId: string,
			status: TenantSubscriptionStatus,
			updatedAt: string
		) {
			const { error } = await supabaseAdmin
				.from("tenant_subscriptions")
				.update({
					status,
					updated_at: updatedAt,
				})
				.eq("asaas_subscription_id", subscriptionId);

			if (error) {
				throw error;
			}
		},
	};
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	if (req.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405);
	}

	if (ASAAS_WEBHOOK_TOKEN) {
		const token = req.headers.get("asaas-access-token");
		if (!token || token !== ASAAS_WEBHOOK_TOKEN) {
			console.error("[ASAAS WEBHOOK] Token inválido ou ausente");
			return jsonResponse({ error: "Unauthorized" }, 401);
		}
	} else {
		console.warn(
			"[ASAAS WEBHOOK] ASAAS_WEBHOOK_TOKEN/SECRET não configurado. Webhook sem validação."
		);
	}

	const supabaseAdmin = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
	);

	try {
		const payload = await req.json();
		console.log("[ASAAS WEBHOOK] Payload recebido:", JSON.stringify(payload));

		const result = await processAsaasWebhookEvent(
			payload,
			createWebhookRepository(supabaseAdmin)
		);

		if (!result.received) {
			const status = result.error === "missing_event_id" ? 400 : 500;
			return jsonResponse(result, status);
		}

		return jsonResponse(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[ASAAS WEBHOOK] Erro fatal:", message);
		return jsonResponse({ received: false, error: message }, 500);
	}
});
