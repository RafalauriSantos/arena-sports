export type BillingOperationalSeverity =
	| "info"
	| "warning"
	| "error"
	| "critical";

export type BillingOperationalEvent = {
	event_type: string;
	severity: BillingOperationalSeverity;
	source: string;
	function_name?: string | null;
	tenant_id?: string | null;
	subscription_id?: string | null;
	payment_id?: string | null;
	webhook_event_id?: string | null;
	message?: string | null;
	metadata?: Record<string, unknown>;
};

type SupabaseAdminClient = {
	from: (table: string) => {
		insert: (payload: Record<string, unknown>) => Promise<{ error: unknown }>;
	};
};

export async function recordBillingOperationalEvent(
	supabaseAdmin: SupabaseAdminClient | null | undefined,
	event: BillingOperationalEvent
) {
	if (!supabaseAdmin) return false;

	try {
		const { error } = await supabaseAdmin
			.from("billing_operational_events")
			.insert({
				event_type: event.event_type,
				severity: event.severity,
				source: event.source,
				function_name: event.function_name ?? null,
				tenant_id: event.tenant_id ?? null,
				subscription_id: event.subscription_id ?? null,
				payment_id: event.payment_id ?? null,
				webhook_event_id: event.webhook_event_id ?? null,
				message: event.message ?? null,
				metadata: event.metadata ?? {},
			});

		return !error;
	} catch {
		return false;
	}
}
