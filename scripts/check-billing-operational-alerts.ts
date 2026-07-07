import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
	formatOperationalAlerts,
	shouldFailOperationalCheck,
	type BillingOperationalAlert,
} from "./billing-operational-alerts-core.ts";

config({ path: ".env.local" });
config();

type BillingOperationalHealth = {
	generated_at: string;
	last_real_webhook_at: string | null;
	last_reconciliation_at: string | null;
	failed_webhooks_24h: number;
	stuck_processing_webhooks: number;
	billing_errors_1h: number;
	duplicate_webhooks_1h: number;
	ignored_webhooks_1h: number;
	payment_stuck_count: number;
	blocked_or_expired_tenants: number;
	active_subscriptions: number;
	billable_subscriptions: number;
};

type BillingTenantRisk = {
	tenant_id: string;
	business_name: string | null;
	status: string;
	asaas_subscription_id: string | null;
	issue_key: string;
	severity: string;
	description: string;
	last_changed_at: string | null;
};

function requiredEnv(name: string) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} ausente`);
	}
	return value;
}

function printHealth(health: BillingOperationalHealth | null) {
	if (!health) {
		console.log("Resumo operacional indisponivel.");
		return;
	}

	console.log("Resumo operacional de billing");
	console.log(`  gerado em: ${health.generated_at}`);
	console.log(`  ultimo webhook real: ${health.last_real_webhook_at ?? "never"}`);
	console.log(
		`  ultima reconciliacao: ${health.last_reconciliation_at ?? "never"}`
	);
	console.log(`  assinaturas billable: ${health.billable_subscriptions}`);
	console.log(`  assinaturas ativas: ${health.active_subscriptions}`);
	console.log(`  webhooks failed 24h: ${health.failed_webhooks_24h}`);
	console.log(
		`  webhooks processing >15min: ${health.stuck_processing_webhooks}`
	);
	console.log(`  erros billing 1h: ${health.billing_errors_1h}`);
	console.log(`  duplicados 1h: ${health.duplicate_webhooks_1h}`);
	console.log(`  ignorados 1h: ${health.ignored_webhooks_1h}`);
	console.log(`  pagamentos presos: ${health.payment_stuck_count}`);
	console.log(
		`  tenants bloqueados/expirados: ${health.blocked_or_expired_tenants}`
	);
}

function printRisks(risks: BillingTenantRisk[]) {
	if (risks.length === 0) {
		console.log("\nNenhum tenant em fila de risco.");
		return;
	}

	console.log("\nTop tenants em risco");
	for (const risk of risks.slice(0, 20)) {
		const name = risk.business_name ?? risk.tenant_id;
		console.log(
			`  [${risk.severity}] ${risk.issue_key} | ${name} | status=${risk.status} | sub=${risk.asaas_subscription_id ?? "n/a"}`
		);
		console.log(`    ${risk.description}`);
	}
}

async function main() {
	const supabaseUrl = requiredEnv("VITE_SUPABASE_URL");
	const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
	const failOnWarning = /^(1|true|yes)$/i.test(
		process.env.FAIL_ON_WARNING ?? ""
	);

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			persistSession: false,
		},
	});

	const { data: health, error: healthError } = await supabase
		.from("billing_ops_health_summary")
		.select("*")
		.maybeSingle<BillingOperationalHealth>();
	if (healthError) throw healthError;

	const { data: alerts, error: alertsError } = await supabase
		.from("billing_ops_alerts")
		.select("*");
	if (alertsError) throw alertsError;

	const { data: risks, error: risksError } = await supabase
		.from("billing_ops_tenant_risks")
		.select("*")
		.limit(20);
	if (risksError) throw risksError;

	printHealth(health);
	console.log("\nAlertas");
	console.log(formatOperationalAlerts((alerts ?? []) as BillingOperationalAlert[]));
	printRisks((risks ?? []) as BillingTenantRisk[]);

	if (
		shouldFailOperationalCheck((alerts ?? []) as BillingOperationalAlert[], {
			failOnWarning,
		})
	) {
		throw new Error("Alertas operacionais de billing ativos.");
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
