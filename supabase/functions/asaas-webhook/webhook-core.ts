export type TenantSubscriptionStatus = "trial" | "active" | "past_due" | "cancelled";

export type TenantSubscription = {
	tenant_id: string;
	status: TenantSubscriptionStatus;
	asaas_subscription_id: string | null;
	updated_at?: string | null;
};

export type AsaasWebhookRepository = {
	claimWebhookEvent(
		eventId: string,
		payload: unknown
	): Promise<"claimed" | "duplicate" | "retry">;
	markWebhookEventDone(eventId: string, processedAt: string): Promise<void>;
	markWebhookEventFailed(eventId: string, processedAt: string): Promise<void>;
	findSubscriptionByAsaasId(subscriptionId: string): Promise<TenantSubscription | null>;
	updateSubscriptionStatus(
		subscriptionId: string,
		status: TenantSubscriptionStatus,
		updatedAt: string
	): Promise<void>;
};

type AsaasWebhookPayload = {
	id?: string;
	event?: string;
	payment?: {
		id?: string;
		subscription?: string;
		status?: string;
	};
	subscription?: {
		id?: string;
		status?: string;
	};
};

export type ProcessWebhookResult = {
	received: boolean;
	duplicate: boolean;
	retried?: boolean;
	ignored?: boolean;
	reason?: string;
	eventId?: string;
	eventType?: string;
	tenantId?: string;
	subscriptionId?: string;
	paymentId?: string;
	status?: TenantSubscriptionStatus;
	error?: string;
};

function asPayload(payload: unknown): AsaasWebhookPayload {
	return (payload ?? {}) as AsaasWebhookPayload;
}

function getEventId(payload: AsaasWebhookPayload): string | null {
	return payload.id || payload.payment?.id || payload.subscription?.id || null;
}

function getEventType(payload: AsaasWebhookPayload): string {
	return payload.event || "UNKNOWN";
}

function getPaymentId(payload: AsaasWebhookPayload): string | null {
	return payload.payment?.id || null;
}

function mapPaymentStatus(status?: string): TenantSubscriptionStatus | null {
	switch ((status || "").toUpperCase()) {
		case "RECEIVED":
		case "CONFIRMED":
		case "RECEIVED_IN_CASH":
			return "active";
		case "OVERDUE":
		case "REFUNDED":
		case "REFUND_REQUESTED":
		case "REFUND_IN_PROGRESS":
		case "CHARGEBACK_REQUESTED":
		case "CHARGEBACK_DISPUTE":
		case "AWAITING_CHARGEBACK_REVERSAL":
		case "DUNNING_REQUESTED":
			return "past_due";
		default:
			return null;
	}
}

function mapSubscriptionStatus(status?: string): TenantSubscriptionStatus | null {
	switch ((status || "").toUpperCase()) {
		case "ACTIVE":
			return "active";
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

function inferTargetStatus(payload: AsaasWebhookPayload): TenantSubscriptionStatus | null {
	const event = (payload.event || "").toUpperCase();

	if (event.startsWith("PAYMENT_")) {
		if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
			return "active";
		}
		if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_REFUNDED") {
			return "past_due";
		}
		return mapPaymentStatus(payload.payment?.status);
	}

	if (event.startsWith("SUBSCRIPTION_")) {
		return mapSubscriptionStatus(payload.subscription?.status);
	}

	return null;
}

function inferSubscriptionId(payload: AsaasWebhookPayload): string | null {
	return payload.payment?.subscription || payload.subscription?.id || null;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export async function processAsaasWebhookEvent(
	rawPayload: unknown,
	repository: AsaasWebhookRepository,
	processedAt = new Date().toISOString()
): Promise<ProcessWebhookResult> {
	const payload = asPayload(rawPayload);
	const eventId = getEventId(payload);
	const eventType = getEventType(payload);
	const paymentId = getPaymentId(payload);
	const subscriptionId = inferSubscriptionId(payload);

	if (!eventId) {
		return {
			received: false,
			duplicate: false,
			error: "missing_event_id",
			eventType,
			subscriptionId: subscriptionId ?? undefined,
			paymentId: paymentId ?? undefined,
		};
	}

	const claim = await repository.claimWebhookEvent(eventId, rawPayload);
	if (claim === "duplicate") {
		return {
			received: true,
			duplicate: true,
			eventId,
			eventType,
			subscriptionId: subscriptionId ?? undefined,
			paymentId: paymentId ?? undefined,
		};
	}

	try {
		const targetStatus = inferTargetStatus(payload);
		if (!targetStatus) {
			await repository.markWebhookEventDone(eventId, processedAt);
			return {
				received: true,
				duplicate: false,
				retried: claim === "retry",
				ignored: true,
				reason: "event_not_actionable",
				eventId,
				eventType,
				subscriptionId: subscriptionId ?? undefined,
				paymentId: paymentId ?? undefined,
			};
		}

		if (!subscriptionId) {
			await repository.markWebhookEventDone(eventId, processedAt);
			return {
				received: true,
				duplicate: false,
				retried: claim === "retry",
				ignored: true,
				reason: "missing_subscription_id",
				eventId,
				eventType,
				paymentId: paymentId ?? undefined,
			};
		}

		const subscription =
			await repository.findSubscriptionByAsaasId(subscriptionId);
		if (!subscription) {
			await repository.markWebhookEventDone(eventId, processedAt);
			return {
				received: true,
				duplicate: false,
				retried: claim === "retry",
				ignored: true,
				reason: "subscription_not_found",
				eventId,
				eventType,
				subscriptionId,
				paymentId: paymentId ?? undefined,
			};
		}

		await repository.updateSubscriptionStatus(
			subscriptionId,
			targetStatus,
			processedAt
		);
		await repository.markWebhookEventDone(eventId, processedAt);

		return {
			received: true,
			duplicate: false,
			retried: claim === "retry",
			eventId,
			eventType,
			tenantId: subscription.tenant_id,
			subscriptionId,
			paymentId: paymentId ?? undefined,
			status: targetStatus,
		};
	} catch (error) {
		await repository.markWebhookEventFailed(eventId, processedAt);
		return {
			received: false,
			duplicate: false,
			retried: claim === "retry",
			eventId,
			eventType,
			subscriptionId: subscriptionId ?? undefined,
			paymentId: paymentId ?? undefined,
			error: errorMessage(error),
		};
	}
}
