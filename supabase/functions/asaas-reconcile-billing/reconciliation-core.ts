import {
	processAsaasWebhookEvent,
	type AsaasWebhookRepository,
	type TenantSubscriptionStatus,
} from "../asaas-webhook/webhook-core.ts";

export type LocalBillingSubscription = {
	tenant_id: string;
	status: TenantSubscriptionStatus;
	asaas_subscription_id: string;
	updated_at?: string | null;
};

export type AsaasSubscriptionSnapshot = {
	id?: string;
	status?: string;
	deleted?: boolean;
};

export type AsaasPaymentSnapshot = {
	id?: string;
	status?: string;
	subscription?: string;
	paymentDate?: string | null;
	confirmedDate?: string | null;
	clientPaymentDate?: string | null;
	dueDate?: string | null;
	dateCreated?: string | null;
};

export type ReconciliationAction =
	| "already_in_sync"
	| "divergence_corrected"
	| "expired_detected"
	| "no_actionable_remote_status"
	| "remote_subscription_missing"
	| "remote_subscription_id_mismatch"
	| "webhook_replayed"
	| "webhook_replay_failed";

export type ReconciliationResult = {
	action: ReconciliationAction;
	tenantId: string;
	subscriptionId: string;
	localStatus: TenantSubscriptionStatus;
	remoteStatus?: TenantSubscriptionStatus;
	source?: "payment" | "subscription";
	paymentId?: string;
	eventId?: string;
	eventType?: string;
	duplicate?: boolean;
	error?: string;
};

type SyntheticEvent = {
	id: string;
	event: string;
	targetStatus: TenantSubscriptionStatus;
	source: "payment" | "subscription";
	paymentId?: string;
	payload: Record<string, unknown>;
};

const ACTIVE_PAYMENT_STATUSES = new Set([
	"RECEIVED",
	"CONFIRMED",
	"RECEIVED_IN_CASH",
]);

const PAST_DUE_PAYMENT_STATUSES = new Set([
	"OVERDUE",
	"REFUNDED",
	"REFUND_REQUESTED",
	"REFUND_IN_PROGRESS",
	"CHARGEBACK_REQUESTED",
	"CHARGEBACK_DISPUTE",
	"AWAITING_CHARGEBACK_REVERSAL",
	"DUNNING_REQUESTED",
]);

function normalizeStatus(status: string | undefined) {
	return (status ?? "").trim().toUpperCase();
}

function paymentStatusToLocal(
	status: string | undefined
): TenantSubscriptionStatus | null {
	const normalized = normalizeStatus(status);
	if (ACTIVE_PAYMENT_STATUSES.has(normalized)) return "active";
	if (PAST_DUE_PAYMENT_STATUSES.has(normalized)) return "past_due";
	return null;
}

function paymentStatusToEvent(status: string | undefined) {
	const normalized = normalizeStatus(status);
	switch (normalized) {
		case "RECEIVED":
			return "PAYMENT_RECEIVED";
		case "CONFIRMED":
			return "PAYMENT_CONFIRMED";
		case "OVERDUE":
			return "PAYMENT_OVERDUE";
		case "REFUNDED":
			return "PAYMENT_REFUNDED";
		default:
			return `PAYMENT_${normalized || "UNKNOWN"}`;
	}
}

function subscriptionStatusToLocal(
	status: string | undefined
): TenantSubscriptionStatus | null {
	const normalized = normalizeStatus(status);
	switch (normalized) {
		case "OVERDUE":
		case "EXPIRED":
			return "past_due";
		case "INACTIVE":
		case "DELETED":
		case "CANCELLED":
		case "CANCELED":
			return "cancelled";
		default:
			return null;
	}
}

function comparablePaymentDate(payment: AsaasPaymentSnapshot) {
	return (
		payment.paymentDate ||
		payment.confirmedDate ||
		payment.clientPaymentDate ||
		payment.dueDate ||
		payment.dateCreated ||
		""
	);
}

export function selectLatestActionablePayment(
	payments: AsaasPaymentSnapshot[]
): AsaasPaymentSnapshot | null {
	const actionable = payments.filter((payment) =>
		Boolean(payment.id && paymentStatusToLocal(payment.status))
	);

	actionable.sort((a, b) =>
		comparablePaymentDate(b).localeCompare(comparablePaymentDate(a))
	);

	return actionable[0] ?? null;
}

export function buildSyntheticReconciliationEvent(
	local: LocalBillingSubscription,
	remoteSubscription: AsaasSubscriptionSnapshot | null,
	payments: AsaasPaymentSnapshot[]
): SyntheticEvent | null {
	const latestPayment = selectLatestActionablePayment(payments);
	if (latestPayment?.id) {
		const targetStatus = paymentStatusToLocal(latestPayment.status);
		if (targetStatus) {
			const event = paymentStatusToEvent(latestPayment.status);
			return {
				id: `reconcile:payment:${latestPayment.id}:${normalizeStatus(
					latestPayment.status
				)}`,
				event,
				targetStatus,
				source: "payment",
				paymentId: latestPayment.id,
				payload: {
					id: `reconcile:payment:${latestPayment.id}:${normalizeStatus(
						latestPayment.status
					)}`,
					event,
					payment: {
						id: latestPayment.id,
						subscription:
							latestPayment.subscription || local.asaas_subscription_id,
						status: normalizeStatus(latestPayment.status),
					},
				},
			};
		}
	}

	const subscriptionStatus = subscriptionStatusToLocal(remoteSubscription?.status);
	if (!subscriptionStatus) return null;

	const normalizedRemoteStatus = normalizeStatus(remoteSubscription?.status);
	return {
		id: `reconcile:subscription:${local.asaas_subscription_id}:${normalizedRemoteStatus}`,
		event: "SUBSCRIPTION_UPDATED",
		targetStatus: subscriptionStatus,
		source: "subscription",
		payload: {
			id: `reconcile:subscription:${local.asaas_subscription_id}:${normalizedRemoteStatus}`,
			event: "SUBSCRIPTION_UPDATED",
			subscription: {
				id: local.asaas_subscription_id,
				status: normalizedRemoteStatus,
			},
		},
	};
}

export function previewBillingReconciliation(
	local: LocalBillingSubscription,
	remoteSubscription: AsaasSubscriptionSnapshot | null,
	payments: AsaasPaymentSnapshot[]
): ReconciliationResult {
	if (!remoteSubscription?.id) {
		return {
			action: "remote_subscription_missing",
			tenantId: local.tenant_id,
			subscriptionId: local.asaas_subscription_id,
			localStatus: local.status,
		};
	}

	if (remoteSubscription.id !== local.asaas_subscription_id) {
		return {
			action: "remote_subscription_id_mismatch",
			tenantId: local.tenant_id,
			subscriptionId: local.asaas_subscription_id,
			localStatus: local.status,
			error: "remote subscription id does not match local subscription id",
		};
	}

	const synthetic = buildSyntheticReconciliationEvent(
		local,
		remoteSubscription,
		payments
	);

	if (!synthetic) {
		return {
			action: "no_actionable_remote_status",
			tenantId: local.tenant_id,
			subscriptionId: local.asaas_subscription_id,
			localStatus: local.status,
		};
	}

	if (local.status === synthetic.targetStatus) {
		return {
			action: "already_in_sync",
			tenantId: local.tenant_id,
			subscriptionId: local.asaas_subscription_id,
			localStatus: local.status,
			remoteStatus: synthetic.targetStatus,
			source: synthetic.source,
			paymentId: synthetic.paymentId,
			eventId: synthetic.id,
			eventType: synthetic.event,
		};
	}

	const isExpired =
		synthetic.source === "subscription" &&
		synthetic.targetStatus === "past_due" &&
		normalizeStatus(remoteSubscription.status) === "EXPIRED";

	return {
		action: isExpired ? "expired_detected" : "divergence_corrected",
		tenantId: local.tenant_id,
		subscriptionId: local.asaas_subscription_id,
		localStatus: local.status,
		remoteStatus: synthetic.targetStatus,
		source: synthetic.source,
		paymentId: synthetic.paymentId,
		eventId: synthetic.id,
		eventType: synthetic.event,
	};
}

export async function reconcileBillingSubscription(
	local: LocalBillingSubscription,
	remoteSubscription: AsaasSubscriptionSnapshot | null,
	payments: AsaasPaymentSnapshot[],
	repository: AsaasWebhookRepository,
	processedAt = new Date().toISOString()
): Promise<ReconciliationResult> {
	const preview = previewBillingReconciliation(local, remoteSubscription, payments);
	if (
		preview.action === "remote_subscription_missing" ||
		preview.action === "remote_subscription_id_mismatch" ||
		preview.action === "no_actionable_remote_status" ||
		preview.action === "already_in_sync"
	) {
		return preview;
	}

	const synthetic = buildSyntheticReconciliationEvent(
		local,
		remoteSubscription,
		payments
	);
	if (!synthetic) return preview;

	const replay = await processAsaasWebhookEvent(
		synthetic.payload,
		repository,
		processedAt
	);

	if (replay.duplicate) {
		await repository.updateSubscriptionStatus(
			local.asaas_subscription_id,
			synthetic.targetStatus,
			processedAt
		);
	}

	if (!replay.received) {
		return {
			action: "webhook_replay_failed",
			tenantId: local.tenant_id,
			subscriptionId: local.asaas_subscription_id,
			localStatus: local.status,
			remoteStatus: synthetic.targetStatus,
			source: synthetic.source,
			paymentId: synthetic.paymentId,
			eventId: synthetic.id,
			eventType: synthetic.event,
			error: replay.error,
		};
	}

	const isExpired =
		synthetic.source === "subscription" &&
		synthetic.targetStatus === "past_due" &&
		normalizeStatus(remoteSubscription.status) === "EXPIRED";

	return {
		action: isExpired ? "expired_detected" : "divergence_corrected",
		tenantId: local.tenant_id,
		subscriptionId: local.asaas_subscription_id,
		localStatus: local.status,
		remoteStatus: synthetic.targetStatus,
		source: synthetic.source,
		paymentId: synthetic.paymentId,
		eventId: synthetic.id,
		eventType: synthetic.event,
		duplicate: replay.duplicate,
	};
}
