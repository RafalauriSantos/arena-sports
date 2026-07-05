import assert from "node:assert/strict";
import {
	processAsaasWebhookEvent,
	type AsaasWebhookRepository,
	type TenantSubscription,
} from "../supabase/functions/asaas-webhook/webhook-core.ts";

type RecordedEvent = {
	event_id: string;
	payload: unknown;
	status: "processing" | "done" | "failed";
	processed_at?: string;
};

class FakeWebhookRepository implements AsaasWebhookRepository {
	events = new Map<string, RecordedEvent>();
	subscriptions = new Map<string, TenantSubscription>();
	updateFailuresRemaining = 0;
	updateCalls = 0;

	constructor(subscription?: TenantSubscription) {
		if (subscription?.asaas_subscription_id) {
			this.subscriptions.set(subscription.asaas_subscription_id, subscription);
		}
	}

	async claimWebhookEvent(eventId: string, payload: unknown) {
		const existing = this.events.get(eventId);
		if (!existing) {
			this.events.set(eventId, {
				event_id: eventId,
				payload,
				status: "processing",
			});
			return "claimed" as const;
		}
		if (existing.status === "failed") {
			this.events.set(eventId, {
				...existing,
				payload,
				status: "processing",
				processed_at: undefined,
			});
			return "claimed" as const;
		}
		return "duplicate" as const;
	}

	async markWebhookEventDone(eventId: string, processedAt: string) {
		const event = this.events.get(eventId);
		assert.ok(event, `event ${eventId} should exist`);
		event.status = "done";
		event.processed_at = processedAt;
	}

	async markWebhookEventFailed(eventId: string, processedAt: string) {
		const event = this.events.get(eventId);
		assert.ok(event, `event ${eventId} should exist`);
		event.status = "failed";
		event.processed_at = processedAt;
	}

	async findSubscriptionByAsaasId(subscriptionId: string) {
		return this.subscriptions.get(subscriptionId) ?? null;
	}

	async updateSubscriptionStatus(subscriptionId: string, status: TenantSubscription["status"], updatedAt: string) {
		this.updateCalls += 1;
		if (this.updateFailuresRemaining > 0) {
			this.updateFailuresRemaining -= 1;
			throw new Error("simulated update failure");
		}

		const subscription = this.subscriptions.get(subscriptionId);
		assert.ok(subscription, `subscription ${subscriptionId} should exist`);
		subscription.status = status;
		subscription.updated_at = updatedAt;
	}
}

const baseSubscription: TenantSubscription = {
	tenant_id: "tenant_1",
	status: "trial",
	asaas_subscription_id: "sub_123",
	updated_at: null,
};

const paymentEvent = (id: string, event: string, status: string) => ({
	id,
	event,
	payment: {
		id: `pay_${id}`,
		subscription: "sub_123",
		status,
		value: 69.9,
	},
});

async function testPaymentReceivedActivatesSubscription() {
	const repo = new FakeWebhookRepository({ ...baseSubscription });

	const result = await processAsaasWebhookEvent(
		paymentEvent("evt_received", "PAYMENT_RECEIVED", "RECEIVED"),
		repo,
		"2026-07-05T10:00:00.000Z"
	);

	assert.equal(result.received, true);
	assert.equal(result.duplicate, false);
	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
	assert.equal(repo.events.get("evt_received")?.status, "done");
}

async function testPaymentConfirmedActivatesSubscription() {
	const repo = new FakeWebhookRepository({ ...baseSubscription });

	const result = await processAsaasWebhookEvent(
		paymentEvent("evt_confirmed", "PAYMENT_CONFIRMED", "CONFIRMED"),
		repo,
		"2026-07-05T10:00:00.000Z"
	);

	assert.equal(result.received, true);
	assert.equal(result.duplicate, false);
	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
	assert.equal(repo.events.get("evt_confirmed")?.status, "done");
}

async function testReceivedInCashActivatesSubscription() {
	const repo = new FakeWebhookRepository({ ...baseSubscription });

	const result = await processAsaasWebhookEvent(
		paymentEvent("evt_received_cash", "PAYMENT_UPDATED", "RECEIVED_IN_CASH"),
		repo,
		"2026-07-05T10:00:00.000Z"
	);

	assert.equal(result.received, true);
	assert.equal(result.duplicate, false);
	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
	assert.equal(repo.events.get("evt_received_cash")?.status, "done");
}

async function testDuplicateEventDoesNotDoubleUpdate() {
	const repo = new FakeWebhookRepository({ ...baseSubscription });
	const event = paymentEvent("evt_duplicate", "PAYMENT_CONFIRMED", "CONFIRMED");

	await processAsaasWebhookEvent(event, repo, "2026-07-05T10:00:00.000Z");
	const second = await processAsaasWebhookEvent(event, repo, "2026-07-05T10:01:00.000Z");

	assert.equal(second.duplicate, true);
	assert.equal(repo.updateCalls, 1);
	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
}

async function testPendingAfterConfirmedDoesNotRegressActiveSubscription() {
	const repo = new FakeWebhookRepository({ ...baseSubscription });

	await processAsaasWebhookEvent(
		paymentEvent("evt_confirmed_first", "PAYMENT_CONFIRMED", "CONFIRMED"),
		repo,
		"2026-07-05T10:00:00.000Z"
	);
	await processAsaasWebhookEvent(
		paymentEvent("evt_pending_late", "PAYMENT_CREATED", "PENDING"),
		repo,
		"2026-07-05T10:02:00.000Z"
	);

	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
	assert.equal(repo.updateCalls, 1);
}

async function testOverdueMarksSubscriptionPastDue() {
	const repo = new FakeWebhookRepository({ ...baseSubscription, status: "active" });

	await processAsaasWebhookEvent(
		paymentEvent("evt_overdue", "PAYMENT_OVERDUE", "OVERDUE"),
		repo,
		"2026-07-05T10:00:00.000Z"
	);

	assert.equal(repo.subscriptions.get("sub_123")?.status, "past_due");
	assert.equal(repo.events.get("evt_overdue")?.status, "done");
}

async function testRefundedMarksSubscriptionPastDue() {
	const repo = new FakeWebhookRepository({ ...baseSubscription, status: "active" });

	await processAsaasWebhookEvent(
		paymentEvent("evt_refunded", "PAYMENT_REFUNDED", "REFUNDED"),
		repo,
		"2026-07-05T10:00:00.000Z"
	);

	assert.equal(repo.subscriptions.get("sub_123")?.status, "past_due");
	assert.equal(repo.events.get("evt_refunded")?.status, "done");
}

async function testFailedEventCanBeRecoveredOnRetry() {
	const repo = new FakeWebhookRepository({ ...baseSubscription });
	repo.updateFailuresRemaining = 1;
	const event = paymentEvent("evt_retry", "PAYMENT_RECEIVED", "RECEIVED");

	const first = await processAsaasWebhookEvent(event, repo, "2026-07-05T10:00:00.000Z");
	assert.equal(first.received, false);
	assert.equal(first.error, "simulated update failure");
	assert.equal(repo.events.get("evt_retry")?.status, "failed");

	const second = await processAsaasWebhookEvent(event, repo, "2026-07-05T10:01:00.000Z");
	assert.equal(second.received, true);
	assert.equal(second.duplicate, false);
	assert.equal(repo.events.get("evt_retry")?.status, "done");
	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
	assert.equal(repo.updateCalls, 2);
}

async function testPaymentWithoutSubscriptionIsRecordedAsFailedButReturnsReceived() {
	const repo = new FakeWebhookRepository({ ...baseSubscription });
	const event = {
		id: "evt_no_subscription",
		event: "PAYMENT_RECEIVED",
		payment: {
			id: "pay_no_subscription",
			status: "RECEIVED",
			value: 69.9,
		},
	};

	const result = await processAsaasWebhookEvent(event, repo, "2026-07-05T10:00:00.000Z");

	assert.equal(result.received, true);
	assert.equal(result.ignored, true);
	assert.equal(result.reason, "missing_subscription_id");
	assert.equal(repo.events.get("evt_no_subscription")?.status, "failed");
	assert.equal(repo.updateCalls, 0);
}

async function main() {
	await testPaymentReceivedActivatesSubscription();
	await testPaymentConfirmedActivatesSubscription();
	await testReceivedInCashActivatesSubscription();
	await testDuplicateEventDoesNotDoubleUpdate();
	await testPendingAfterConfirmedDoesNotRegressActiveSubscription();
	await testOverdueMarksSubscriptionPastDue();
	await testRefundedMarksSubscriptionPastDue();
	await testFailedEventCanBeRecoveredOnRetry();
	await testPaymentWithoutSubscriptionIsRecordedAsFailedButReturnsReceived();
	console.log("✅ Webhook core tests passed");
}

main().catch((error) => {
	console.error("❌ Webhook core tests failed");
	console.error(error);
	process.exit(1);
});
