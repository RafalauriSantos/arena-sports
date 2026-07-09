import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
	assertAsaasEnvironment,
	isAsaasSandboxUrl,
	resolveAsaasApiUrl,
} from "../_shared/asaas-env.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { recordBillingOperationalEvent } from "../_shared/billing-ops.ts";
import {
	createRequestContext,
	errorMessage,
	jsonResponse,
	logEvent,
	withLogFields,
	type RequestLogContext,
} from "../_shared/observability.ts";
import {
	previewBillingReconciliation,
	reconcileBillingSubscription,
	type AsaasPaymentSnapshot,
	type AsaasSubscriptionSnapshot,
	type LocalBillingSubscription,
} from "./reconciliation-core.ts";
import type {
	AsaasWebhookRepository,
	TenantSubscriptionStatus,
} from "../asaas-webhook/webhook-core.ts";

const FUNCTION_NAME = "asaas-reconcile-billing";
const DEFAULT_LIMIT = 100;

const ASAAS_API_KEY =
	Deno.env.get("ASAAS_API_KEY") ?? Deno.env.get("ASAAS_ACCESS_TOKEN");
const ASAAS_URL = resolveAsaasApiUrl();
const RECONCILIATION_TOKEN =
	Deno.env.get("BILLING_RECONCILIATION_TOKEN") ??
	Deno.env.get("ASAAS_RECONCILIATION_TOKEN") ??
	"";

function cleanToken(value: string | null) {
	const trimmed = value?.trim();
	if (!trimmed) return "";
	if (/^Bearer\s+/i.test(trimmed)) return trimmed.replace(/^Bearer\s+/i, "");
	return trimmed;
}

function parseLimit(value: unknown) {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
	return Math.min(Math.floor(n), 500);
}

function incrementSummary(
	summary: {
		already_in_sync: number;
		corrected: number;
		expired_detected: number;
		no_action: number;
		remote_missing: number;
		failed: number;
	},
	action: string
) {
	switch (action) {
		case "already_in_sync":
			summary.already_in_sync += 1;
			break;
		case "divergence_corrected":
			summary.corrected += 1;
			break;
		case "expired_detected":
			summary.expired_detected += 1;
			break;
		case "remote_subscription_missing":
			summary.remote_missing += 1;
			break;
		case "webhook_replay_failed":
			summary.failed += 1;
			break;
		default:
			summary.no_action += 1;
			break;
	}
}

function getWebhookEventType(payload: unknown): string {
	if (payload && typeof payload === "object" && "event" in payload) {
		const event = (payload as { event?: unknown }).event;
		if (typeof event === "string" && event.trim()) return event;
	}
	return "UNKNOWN";
}

function createReconciliationRepository(
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

			if (!insertError) return "claimed";

			if (insertError.code !== "23505") {
				logEvent(context, "error", "reconciliation_event_claim_failed", {
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
				logEvent(context, "error", "reconciliation_event_lookup_failed", {
					event_id: eventId,
					error: selectError,
				});
				throw selectError;
			}

			if (existingEvent?.status !== "failed") return "duplicate";

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
				logEvent(context, "error", "reconciliation_retry_claim_failed", {
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
			if (error) throw error;
		},

		async markWebhookEventFailed(eventId: string, processedAt: string) {
			const { error } = await supabaseAdmin
				.from("asaas_webhook_events")
				.update({ status: "failed", processed_at: processedAt })
				.eq("event_id", eventId);
			if (error) throw error;
		},

		async findSubscriptionByAsaasId(subscriptionId: string) {
			const { data, error } = await supabaseAdmin
				.from("tenant_subscriptions")
				.select("tenant_id,status,asaas_subscription_id,updated_at")
				.eq("asaas_subscription_id", subscriptionId)
				.maybeSingle();
			if (error) throw error;
			return data;
		},

		async updateSubscriptionStatus(
			subscriptionId: string,
			status: TenantSubscriptionStatus,
			updatedAt: string
		) {
			const { error } = await supabaseAdmin
				.from("tenant_subscriptions")
				.update({ status, updated_at: updatedAt })
				.eq("asaas_subscription_id", subscriptionId);
			if (error) throw error;
		},
	};
}

async function asaasRequest<T>(
	path: string,
	context: RequestLogContext,
	operation: string
): Promise<T> {
	if (!ASAAS_API_KEY?.trim()) {
		throw new Error("ASAAS_API_KEY não configurada");
	}
	assertAsaasEnvironment(ASAAS_URL, ASAAS_API_KEY);

	logEvent(context, "info", "asaas_api_request_started", {
		operation,
		path,
		asaas_environment: isAsaasSandboxUrl(ASAAS_URL) ? "sandbox" : "production",
	});

	const res = await fetch(`${ASAAS_URL}${path}`, {
		headers: {
			"Content-Type": "application/json",
			access_token: ASAAS_API_KEY.trim(),
		},
	});

	const body = await res.json().catch(() => null);
	if (!res.ok || body?.errors) {
		logEvent(context, "error", "asaas_api_request_failed", {
			operation,
			path,
			status: res.status,
			errors: body?.errors,
		});
		throw new Error(
			body?.errors?.[0]?.description ||
				body?.errors?.[0]?.message ||
				`Asaas retornou ${res.status}`
		);
	}

	return body as T;
}

async function fetchSubscriptionPayments(
	subscriptionId: string,
	context: RequestLogContext
) {
	try {
		const data = await asaasRequest<{ data?: AsaasPaymentSnapshot[] }>(
			`/subscriptions/${encodeURIComponent(subscriptionId)}/payments?limit=100`,
			context,
			"list_subscription_payments"
		);
		return Array.isArray(data.data) ? data.data : [];
	} catch (error) {
		logEvent(context, "warn", "asaas_subscription_payments_endpoint_failed", {
			subscription_id: subscriptionId,
			error,
		});
		const fallback = await asaasRequest<{ data?: AsaasPaymentSnapshot[] }>(
			`/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=100`,
			context,
			"list_payments_by_subscription"
		);
		return Array.isArray(fallback.data) ? fallback.data : [];
	}
}

serve(async (req) => {
	let context = createRequestContext(FUNCTION_NAME, req);
	let supabaseAdmin: any | null = null;

	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	logEvent(context, "info", "request_started", { method: req.method });

	if (req.method !== "POST") {
		logEvent(context, "warn", "method_not_allowed", { method: req.method });
		return jsonResponse({ error: "Method not allowed" }, 405, context, corsHeaders);
	}

	if (!RECONCILIATION_TOKEN) {
		logEvent(context, "error", "reconciliation_token_missing");
		return jsonResponse(
			{ error: "Reconciliation token not configured" },
			503,
			context,
			corsHeaders
		);
	}

	const token =
		cleanToken(req.headers.get("x-reconciliation-token")) ||
		cleanToken(req.headers.get("authorization"));
	if (token !== RECONCILIATION_TOKEN) {
		logEvent(context, "warn", "reconciliation_auth_failed", {
			reason: token ? "invalid_token" : "missing_token",
		});
		return jsonResponse({ error: "Unauthorized" }, 401, context, corsHeaders);
	}

	try {
		const body = await req.json().catch(() => ({}));
		const limit = parseLimit((body as { limit?: unknown }).limit);
		const dryRun = Boolean((body as { dry_run?: unknown }).dry_run);

		if (!ASAAS_API_KEY?.trim()) {
			logEvent(context, "error", "asaas_config_missing", {
				config_key: "ASAAS_API_KEY",
			});
			return jsonResponse(
				{ error: "ASAAS_API_KEY not configured" },
				503,
				context,
				corsHeaders
			);
		}
		assertAsaasEnvironment(ASAAS_URL, ASAAS_API_KEY);

		supabaseAdmin = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
		);

		const { data: subscriptions, error: subscriptionsError } =
			await supabaseAdmin
				.from("tenant_subscriptions")
				.select("tenant_id,status,asaas_subscription_id,updated_at")
				.not("asaas_subscription_id", "is", null)
				.in("status", ["trial", "active", "past_due", "cancelled"])
				.order("updated_at", { ascending: true, nullsFirst: true })
				.limit(limit);

		if (subscriptionsError) {
			logEvent(context, "error", "subscription_scan_failed", {
				error: subscriptionsError,
			});
			throw subscriptionsError;
		}

		const rows = (subscriptions ?? []) as LocalBillingSubscription[];
		logEvent(context, "info", "reconciliation_scan_started", {
			subscriptions_found: rows.length,
			limit,
			dry_run: dryRun,
		});

		const summary = {
			scanned: rows.length,
			already_in_sync: 0,
			corrected: 0,
			expired_detected: 0,
			no_action: 0,
			remote_missing: 0,
			failed: 0,
		};
		const actions = [];

		for (const row of rows) {
			context = withLogFields(context, {
				tenant_id: row.tenant_id,
				subscription_id: row.asaas_subscription_id,
			});

			try {
				const remoteSubscription =
					await asaasRequest<AsaasSubscriptionSnapshot>(
						`/subscriptions/${encodeURIComponent(row.asaas_subscription_id)}`,
						context,
						"get_subscription"
					);
				const payments = await fetchSubscriptionPayments(
					row.asaas_subscription_id,
					context
				);

				if (dryRun) {
					const preview = previewBillingReconciliation(
						row,
						remoteSubscription,
						payments
					);
					actions.push(preview);
					incrementSummary(summary, preview.action);
					logEvent(context, "info", "reconciliation_dry_run_checked", preview);
					continue;
				}

				const result = await reconcileBillingSubscription(
					row,
					remoteSubscription,
					payments,
					createReconciliationRepository(supabaseAdmin, context)
				);

				actions.push(result);
				incrementSummary(summary, result.action);

				logEvent(
					withLogFields(context, {
						tenant_id: result.tenantId,
						subscription_id: result.subscriptionId,
						payment_id: result.paymentId ?? null,
					}),
					result.action === "webhook_replay_failed" ? "error" : "info",
					"reconciliation_action_recorded",
					result
				);

				if (result.action !== "already_in_sync") {
					await recordBillingOperationalEvent(supabaseAdmin, {
						event_type: "reconciliation_action",
						severity:
							result.action === "webhook_replay_failed" ? "error" : "info",
						source: "asaas-reconcile-billing",
						function_name: FUNCTION_NAME,
						tenant_id: result.tenantId,
						subscription_id: result.subscriptionId,
						payment_id: result.paymentId ?? null,
						message: "Reconciliacao registrou acao operacional.",
						metadata: {
							action: result.action,
							local_status: result.localStatus,
							remote_subscription_status: result.remoteSubscriptionStatus,
							remote_payment_status: result.remotePaymentStatus,
							target_status: result.targetStatus,
						},
					});
				}
			} catch (error) {
				summary.failed += 1;
				const failure = {
					action: "webhook_replay_failed",
					tenantId: row.tenant_id,
					subscriptionId: row.asaas_subscription_id,
					localStatus: row.status,
					error: errorMessage(error),
				};
				actions.push(failure);
				logEvent(context, "error", "reconciliation_subscription_failed", failure);
				await recordBillingOperationalEvent(supabaseAdmin, {
					event_type: "reconciliation_subscription_failed",
					severity: "error",
					source: "asaas-reconcile-billing",
					function_name: FUNCTION_NAME,
					tenant_id: row.tenant_id,
					subscription_id: row.asaas_subscription_id,
					message: "Falha ao reconciliar assinatura com Asaas.",
					metadata: {
						local_status: row.status,
						error_message: errorMessage(error),
					},
				});
			}
		}

		const status = summary.failed > 0 ? 500 : 200;
		logEvent(context, summary.failed > 0 ? "warn" : "info", "reconciliation_finished", {
			summary,
		});
		await recordBillingOperationalEvent(supabaseAdmin, {
			event_type: "reconciliation_run_finished",
			severity: summary.failed > 0 ? "error" : "info",
			source: "asaas-reconcile-billing",
			function_name: FUNCTION_NAME,
			message: "Execucao da reconciliacao de billing finalizada.",
			metadata: {
				summary,
				dry_run: dryRun,
				limit,
			},
		});

		return jsonResponse({ ok: summary.failed === 0, summary, actions }, status, context, corsHeaders);
	} catch (error) {
		logEvent(context, "error", "unexpected_error", { error });
		await recordBillingOperationalEvent(supabaseAdmin, {
			event_type: "reconciliation_unexpected_error",
			severity: "error",
			source: "asaas-reconcile-billing",
			function_name: FUNCTION_NAME,
			message: "Erro inesperado na reconciliacao de billing.",
			metadata: {
				error_message: errorMessage(error),
			},
		});
		return jsonResponse(
			{ error: errorMessage(error) },
			500,
			context,
			corsHeaders
		);
	}
});
