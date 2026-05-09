import "./env";

export const e2eConfig = {
	baseUrl: process.env.E2E_BASE_URL || "http://localhost:5000",
	publicSubdomain: process.env.E2E_PUBLIC_SUBDOMAIN || "arena-society",
	adminEmail: process.env.E2E_ADMIN_EMAIL,
	adminPassword: process.env.E2E_ADMIN_PASSWORD,
	supabaseUrl: process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
	supabaseAnonKey:
		process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
	supabaseServiceKey:
		process.env.E2E_SUPABASE_SERVICE_KEY ||
		process.env.SUPABASE_SERVICE_ROLE_KEY,
	allowWrite: process.env.E2E_ALLOW_WRITE === "true",
};
