const PRODUCTION_ASAAS_API_URL = "https://api.asaas.com/v3";

export function resolveAsaasApiUrl(): string {
	return (
		Deno.env.get("ASAAS_API_URL") ||
		Deno.env.get("ASAAS_BASE_URL") ||
		PRODUCTION_ASAAS_API_URL
	).replace(/\/+$/, "");
}

export function isAsaasSandboxUrl(apiUrl: string): boolean {
	return /sandbox/i.test(apiUrl);
}

export function assertAsaasEnvironment(apiUrl: string, apiKey?: string | null) {
	const runtimeEnv = (
		Deno.env.get("ASAAS_ENVIRONMENT") ||
		Deno.env.get("APP_ENV") ||
		Deno.env.get("ENVIRONMENT") ||
		""
	).toLowerCase();
	const frontendUrl = Deno.env.get("FRONTEND_URL") || "";
	const expectsProduction =
		runtimeEnv === "production" || /(^|\.)arenasys\.com\.br/i.test(frontendUrl);

	if (!expectsProduction) return;

	if (isAsaasSandboxUrl(apiUrl)) {
		throw new Error("ASAAS_API_URL cannot point to sandbox in production");
	}

	if (apiKey && /hmlg/i.test(apiKey)) {
		throw new Error("ASAAS_API_KEY appears to be a sandbox key in production");
	}
}
