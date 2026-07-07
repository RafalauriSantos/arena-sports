export type BillingOperationalSeverity =
	| "critical"
	| "high"
	| "warning"
	| "info";

export type BillingOperationalAlert = {
	severity: BillingOperationalSeverity;
	alert_key: string;
	title: string;
	details: string;
	current_value: string | null;
	threshold_value: string | null;
	generated_at?: string | null;
};

const severityWeight: Record<BillingOperationalSeverity, number> = {
	critical: 4,
	high: 3,
	warning: 2,
	info: 1,
};

export function sortOperationalAlerts(
	alerts: BillingOperationalAlert[]
): BillingOperationalAlert[] {
	return [...alerts].sort((a, b) => {
		const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
		if (severityDiff !== 0) return severityDiff;
		return a.alert_key.localeCompare(b.alert_key);
	});
}

export function shouldFailOperationalCheck(
	alerts: BillingOperationalAlert[],
	options: { failOnWarning?: boolean } = {}
) {
	return alerts.some((alert) => {
		if (alert.severity === "critical" || alert.severity === "high") {
			return true;
		}

		return Boolean(options.failOnWarning && alert.severity === "warning");
	});
}

export function formatOperationalAlerts(alerts: BillingOperationalAlert[]) {
	if (alerts.length === 0) {
		return "Nenhum alerta operacional ativo.";
	}

	return sortOperationalAlerts(alerts)
		.map((alert) =>
			[
				`[${alert.severity.toUpperCase()}] ${alert.alert_key}`,
				`  ${alert.title}`,
				`  ${alert.details}`,
				`  valor atual: ${alert.current_value ?? "n/a"}`,
				`  limite: ${alert.threshold_value ?? "n/a"}`,
			].join("\n")
		)
		.join("\n\n");
}
