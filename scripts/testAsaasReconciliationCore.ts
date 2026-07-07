import assert from "node:assert/strict";
import {
	reconcileBillingSubscription,
	type AsaasPaymentSnapshot,
	type AsaasSubscriptionSnapshot,
	type LocalBillingSubscription,
} from "../supabase/functions/asaas-reconcile-billing/reconciliation-core.ts";
import type {
	AsaasWebhookRepository,
	TenantSubscription,
	TenantSubscriptionStatus,
} from "../supabase/functions/asaas-webhook/webhook-core.ts";

class FakeReconciliationRepo implements AsaasWebhookRepository {
	events = new Map<string, "processing" | "done" | "failed">();
	subscriptions = new Map<string, TenantSubscription>();
	updates: Array<{ subscriptionId: string; status: TenantSubscriptionStatus }> = [];

	constructor(subscription: TenantSubscription) {
		if (subscription.asaas_subscription_id) {
			this.subscriptions.set(subscription.asaas_subscription_id, subscription);
		}
	}

	async claimWebhookEvent(eventId: string) {
		const status = this.events.get(eventId);
		if (!status) {
			this.events.set(eventId, "processing");
			return "claimed" as const;
		}
		if (status === "failed") {
			this.events.set(eventId, "processing");
			return "retry" as const;
		}
		return "duplicate" as const;
	}

	async markWebhookEventDone(eventId: string) {
		this.events.set(eventId, "done");
	}

	async markWebhookEventFailed(eventId: string) {
		this.events.set(eventId, "failed");
	}

	async findSubscriptionByAsaasId(subscriptionId: string) {
		return this.subscriptions.get(subscriptionId) ?? null;
	}

	async updateSubscriptionStatus(
		subscriptionId: string,
		status: TenantSubscriptionStatus
	) {
		const current = this.subscriptions.get(subscriptionId);
		if (!current) throw new Error("subscription not found");
		this.subscriptions.set(subscriptionId, { ...current, status });
		this.updates.push({ subscriptionId, status });
	}
}

const local = (
	status: TenantSubscriptionStatus,
	subscriptionId = "sub_123"
): LocalBillingSubscription => ({
	tenant_id: "tenant_123",
	status,
	asaas_subscription_id: subscriptionId,
	updated_at: "2026-07-01T00:00:00.000Z",
});

const remoteSub = (
	status = "ACTIVE",
	id = "sub_123"
): AsaasSubscriptionSnapshot => ({
	id,
	status,
});

const payment = (
	status: string,
	id = `pay_${status.toLowerCase()}`
): AsaasPaymentSnapshot => ({
	id,
	status,
	subscription: "sub_123",
	dueDate: "2026-07-06",
});

async function testPaymentReceivedActivatesTrial() {
	const row = local("trial");
	const repo = new FakeReconciliationRepo(row);
	const result = await reconcileBillingSubscription(
		row,
		remoteSub("ACTIVE"),
		[payment("RECEIVED", "pay_received")],
		repo,
		"2026-07-06T12:00:00.000Z"
	);

	assert.equal(result.action, "divergence_corrected");
	assert.equal(result.remoteStatus, "active");
	assert.equal(result.paymentId, "pay_received");
	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
	assert.equal(repo.events.get("reconcile:payment:pay_received:RECEIVED"), "done");
}

async function testDuplicateSyntheticEventStillCorrectsDivergence() {
	const row = local("trial");
	const repo = new FakeReconciliationRepo(row);
	repo.events.set("reconcile:payment:pay_received:RECEIVED", "done");

	const result = await reconcileBillingSubscription(
		row,
		remoteSub("ACTIVE"),
		[payment("RECEIVED", "pay_received")],
		repo,
		"2026-07-06T12:00:00.000Z"
	);

	assert.equal(result.action, "divergence_corrected");
	assert.equal(result.duplicate, true);
	assert.equal(repo.subscriptions.get("sub_123")?.status, "active");
}

async function testOverdueMarksActiveAsPastDue() {
	const row = local("active");
	const repo = new FakeReconciliationRepo(row);
	const result = await reconcileBillingSubscription(
		row,
		remoteSub("ACTIVE"),
		[payment("OVERDUE", "pay_overdue")],
		repo
	);

	assert.equal(result.action, "divergence_corrected");
	assert.equal(result.remoteStatus, "past_due");
	assert.equal(repo.subscriptions.get("sub_123")?.status, "past_due");
}

async function testExpiredSubscriptionIsDetected() {
	const row = local("active");
	const repo = new FakeReconciliationRepo(row);
	const result = await reconcileBillingSubscription(row, remoteSub("EXPIRED"), [], repo);

	assert.equal(result.action, "expired_detected");
	assert.equal(result.remoteStatus, "past_due");
	assert.equal(result.source, "subscription");
	assert.equal(repo.subscriptions.get("sub_123")?.status, "past_due");
}

async function testPendingPaymentDoesNotChangeTrial() {
	const row = local("trial");
	const repo = new FakeReconciliationRepo(row);
	const result = await reconcileBillingSubscription(
		row,
		remoteSub("ACTIVE"),
		[payment("PENDING", "pay_pending")],
		repo
	);

	assert.equal(result.action, "no_actionable_remote_status");
	assert.equal(repo.subscriptions.get("sub_123")?.status, "trial");
}

async function testRemoteSubscriptionMissingIsReported() {
	const row = local("past_due");
	const repo = new FakeReconciliationRepo(row);
	const result = await reconcileBillingSubscription(row, null, [], repo);

	assert.equal(result.action, "remote_subscription_missing");
	assert.equal(repo.updates.length, 0);
}

await testPaymentReceivedActivatesTrial();
await testDuplicateSyntheticEventStillCorrectsDivergence();
await testOverdueMarksActiveAsPastDue();
await testExpiredSubscriptionIsDetected();
await testPendingPaymentDoesNotChangeTrial();
await testRemoteSubscriptionMissingIsReported();

console.log("✅ Asaas reconciliation core tests passed");
