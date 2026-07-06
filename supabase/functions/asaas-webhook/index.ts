import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
	createRequestContext,
	errorMessage,
	jsonResponse as observableJsonResponse,
	logEvent,
	withLogFields,
	type RequestLogContext,
} from "../_shared/observability.ts";
import {
	processAsaasWebhookEvent,
	type AsaasWebhookRepository,
	type TenantSubscriptionStatus,
} from "./webhook-core.ts";

const ASAAS_WEBHOOK_TOKEN =
	Deno.env.get("ASAAS_WEBHOOK_SECRET") ??
	Deno.env.get("ASAAS_WEBHOOK_TOKEN") ??
	"";

const FUNCTION_NAME = "asaas-webhook";

function getWebhookEventType(payload: unknown): string {
	if (payload && typeof payload === "object" && "event" in payload) {
		const event = (payload as { event?: unknown }).event;
		if (typeof event === "string" && event.trim()) {
			return event;
		}
	}

	return "UNKNOWN";
}

function jsonResponse(
	body: unknown,
	status: number,
	context: RequestLogContext
) {
	return observableJsonResponse(body, status, context, corsHeaders);
}

function createWebhookRepository(
	supabaseAdmin: any,
	context: RequestLogContext
): AsaasWebhookRepository {
	return {
		async claimWebhookEvent(eventId: string, payload: unknown) {
			const { error: insertError } = await supabaseAdmin
				.from("asaas_webhook_events")
				.insert({
					event_id: eventId,
					event_type: getWebhookEventType(payload),
					payload,
					status: "processing",
				});

			if (!insertError) {
				return "claimed";
			}

			if (insertError.code !== "23505") {
				logEvent(context, "error", "webhook_event_claim_failed", {
					event_id: eventId,
					error: insertError,
				});
				throw insertError;
			}

			const { data: existingEvent, error: selectError } = await supabaseAdmin
				.from("asaas_webhook_events")
				.select("status")
				.eq("event_id", eventId)
				.maybeSingle();

			if (selectError) {
				logEvent(context, "error", "webhook_event_lookup_failed", {
					event_id: eventId,
					error: selectError,
				});
				throw selectError;
			}

			if (existingEvent?.status !== "failed") {
				return "duplicate";
			}

			logEvent(context, "warn", "webhook_retry_claimed", {
				event_id: eventId,
				previous_status: existingEvent.status,
			});

			const { error: updateError } = await supabaseAdmin
				.from("asaas_webhook_events")
				.update({
					event_type: getWebhookEventType(payload),
					payload,
					status: "processing",
					processed_at: null,
				})
				.eq("event_id", eventId);

			if (updateError) {
				logEvent(context, "error", "webhook_retry_claim_failed", {
					event_id: eventId,
					error: updateError,
				});
				throw updateError;
			}

			return "retry";
		},

		async markWebhookEventDone(eventId: string, processedAt: string) {
			const { error } = await supabaseAdmin
				.from("asaas_webhook_events")
				.update({ status: "done", processed_at: processedAt })
				.eq("event_id", eventId);

			if (error) {
				logEvent(context, "error", "webhook_event_mark_done_failed", {
					event_id: eventId,
					error,
				});
				throw error;
			}
		},

		async markWebhookEventFailed(eventId: string, processedAt: string) {
			const { error } = await supabaseAdmin
				.from("asaas_webhook_events")
				.update({ status: "failed", processed_at: processedAt })
				.eq("event_id", eventId);

			if (error) {
				logEvent(context, "error", "webhook_event_mark_failed_failed", {
					event_id: eventId,
					error,
				});
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
				logEvent(context, "error", "subscription_lookup_failed", {
					subscription_id: subscriptionId,
					error,
				});
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
				logEvent(context, "error", "subscription_update_failed", {
					subscription_id: subscriptionId,
					target_status: status,
					error,
				});
				throw error;
			}
		},
	};
}

serve(async (req) => {
	const baseContext = createRequestContext(FUNCTION_NAME, req);

	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	logEvent(baseContext, "info", "request_started", {
		method: req.method,
	});

	if (req.method !== "POST") {
		logEvent(baseContext, "warn", "method_not_allowed", {
			method: req.method,
		});
		return jsonResponse({ error: "Method not allowed" }, 405, baseContext);
	}

	if (ASAAS_WEBHOOK_TOKEN) {
		const token = req.headers.get("asaas-access-token");
		if (!token || token !== ASAAS_WEBHOOK_TOKEN) {
			logEvent(baseContext, "warn", "webhook_auth_failed", {
				reason: token ? "invalid_token" : "missing_token",
			});
			return jsonResponse({ error: "Unauthorized" }, 401, baseContext);
		}
	} else {
		logEvent(baseContext, "error", "webhook_secret_missing", {
			reason: "ASAAS_WEBHOOK_TOKEN_OR_SECRET_NOT_CONFIGURED",
		});
	}

	const supabaseAdmin = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
	);

	try {
		const payload = await req.json();
		logEvent(baseContext, "info", "webhook_received", {
			event_type: getWebhookEventType(payload),
			event_id:
				(payload as { id?: unknown })?.id ??
				(payload as { payment?: { id?: unknown } })?.payment?.id ??
				(payload as { subscription?: { id?: unknown } })?.subscription?.id,
			subscription_id:
				(payload as { payment?: { subscription?: unknown } })?.payment
					?.subscription ??
				(payload as { subscription?: { id?: unknown } })?.subscription?.id,
			payment_id: (payload as { payment?: { id?: unknown } })?.payment?.id,
		});

		const result = await processAsaasWebhookEvent(
			payload,
			createWebhookRepository(supabaseAdmin, baseContext)
		);

		const resultContext = withLogFields(baseContext, {
			tenant_id: result.tenantId ?? null,
			subscription_id: result.subscriptionId ?? null,
			payment_id: result.paymentId ?? null,
		});

		if (result.duplicate) {
			logEvent(resultContext, "warn", "webhook_duplicate_ignored", {
				event_id: result.eventId,
				event_type: result.eventType,
			});
		} else if (result.ignored) {
			logEvent(resultContext, "warn", "webhook_event_ignored", {
				event_id: result.eventId,
				event_type: result.eventType,
				reason: result.reason,
				retried: Boolean(result.retried),
			});
		} else if (!result.received) {
			logEvent(resultContext, "error", "webhook_processing_failed", {
				event_id: result.eventId,
				event_type: result.eventType,
				error: result.error,
				retried: Boolean(result.retried),
			});
		} else {
			logEvent(resultContext, "info", "webhook_processed", {
				event_id: result.eventId,
				event_type: result.eventType,
				status: result.status,
				retried: Boolean(result.retried),
			});
		}

		if (!result.received) {
			const status = result.error === "missing_event_id" ? 400 : 500;
			return jsonResponse(result, status, resultContext);
		}

		return jsonResponse(result, 200, resultContext);
	} catch (error) {
		const message = errorMessage(error);
		logEvent(baseContext, "error", "unexpected_error", {
			error,
			error_message: message,
		});
		return jsonResponse({ received: false, error: message }, 500, baseContext);
	}
});
