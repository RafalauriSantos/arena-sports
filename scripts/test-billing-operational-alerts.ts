import assert from "node:assert/strict";
import {
	formatOperationalAlerts,
	shouldFailOperationalCheck,
	sortOperationalAlerts,
	type BillingOperationalAlert,
} from "./billing-operational-alerts-core.ts";

const warningAlert: BillingOperationalAlert = {
	severity: "warning",
	alert_key: "webhook_duplicate_spike",
	title: "Volume alto de webhooks duplicados",
	details: "Mais de 20 duplicidades foram ignoradas na ultima hora.",
	current_value: "25",
	threshold_value: "<= 20 per hour",
};

const highAlert: BillingOperationalAlert = {
	severity: "high",
	alert_key: "payment_stuck",
	title: "Pagamentos pendentes sem ativacao",
	details: "Assinaturas com ID do Asaas seguem em trial depois de 30 minutos.",
	current_value: "1",
	threshold_value: "= 0",
};

const criticalAlert: BillingOperationalAlert = {
	severity: "critical",
	alert_key: "webhook_stopped",
	title: "Webhook do Asaas sem eventos recentes",
	details: "Nenhum webhook real do Asaas foi registrado nas ultimas 2 horas.",
	current_value: "never",
	threshold_value: "last_real_webhook_at >= now() - 2 hours",
};

assert.equal(shouldFailOperationalCheck([]), false);
assert.equal(shouldFailOperationalCheck([warningAlert]), false);
assert.equal(
	shouldFailOperationalCheck([warningAlert], { failOnWarning: true }),
	true
);
assert.equal(shouldFailOperationalCheck([highAlert]), true);
assert.equal(shouldFailOperationalCheck([criticalAlert]), true);

const sorted = sortOperationalAlerts([warningAlert, highAlert, criticalAlert]);
assert.deepEqual(
	sorted.map((alert) => alert.alert_key),
	["webhook_stopped", "payment_stuck", "webhook_duplicate_spike"]
);

const formatted = formatOperationalAlerts([highAlert]);
assert.ok(formatted.includes("[HIGH] payment_stuck"));
assert.ok(formatted.includes("valor atual: 1"));
assert.ok(formatOperationalAlerts([]).includes("Nenhum alerta"));

console.log("Billing operational alert tests passed");
