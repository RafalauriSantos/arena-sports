import { test, expect } from "@playwright/test";
import { e2eConfig } from "../utils/config";

const toDateString = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

test.describe("Supabase API", () => {
	test("public booking bootstrap contract @api @qa", async () => {
		const supabaseUrl = e2eConfig.supabaseUrl;
		const anonKey = e2eConfig.supabaseAnonKey;
		const subdomain = e2eConfig.publicSubdomain;

		if (!supabaseUrl || !anonKey || !subdomain) {
			test.skip(true, "Set Supabase URL/anon key and E2E_PUBLIC_SUBDOMAIN.");
			return;
		}

		const tenantResponse = await fetch(
			`${supabaseUrl}/rest/v1/rpc/fn_public_get_tenant_by_subdomain`,
			{
				method: "POST",
				headers: {
					apikey: anonKey,
					Authorization: `Bearer ${anonKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ p_subdomain: subdomain }),
			},
		);

		if (!tenantResponse.ok) {
			throw new Error(`Tenant bootstrap failed with HTTP ${tenantResponse.status}`);
		}

		const tenantPayload = await tenantResponse.json();
		const tenant = Array.isArray(tenantPayload) ? tenantPayload[0] : tenantPayload;
		expect(tenant?.id).toBeTruthy();
		expect(tenant?.business_name).toBeTruthy();

		const courtsResponse = await fetch(
			`${supabaseUrl}/rest/v1/rpc/fn_public_get_courts_by_subdomain`,
			{
				method: "POST",
				headers: {
					apikey: anonKey,
					Authorization: `Bearer ${anonKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ p_subdomain: subdomain }),
			},
		);

		if (!courtsResponse.ok) {
			throw new Error(`Public courts query failed with HTTP ${courtsResponse.status}`);
		}

		const courts = await courtsResponse.json();
		expect(Array.isArray(courts)).toBeTruthy();
		expect(courts.length).toBeGreaterThan(0);
		for (const court of courts) {
			expect(court.id).toBeTruthy();
			expect(court.name).toBeTruthy();
			expect(Number(court.base_price)).toBeGreaterThan(0);
		}
	});

	test("public occupied slots rpc @api", async () => {
		const supabaseUrl = e2eConfig.supabaseUrl;
		const anonKey = e2eConfig.supabaseAnonKey;
		const subdomain = e2eConfig.publicSubdomain;

		if (!supabaseUrl || !anonKey || !subdomain) {
			test.skip(true, "Set Supabase URL/anon key and E2E_PUBLIC_SUBDOMAIN.");
			return;
		}

		const response = await fetch(
			`${supabaseUrl}/rest/v1/rpc/fn_public_get_occupied_slots`,
			{
				method: "POST",
				headers: {
					apikey: anonKey,
					Authorization: `Bearer ${anonKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					p_subdomain: subdomain,
					p_date: toDateString(),
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Supabase RPC failed with HTTP ${response.status}`);
		}
		const payload = await response.json();
		expect(Array.isArray(payload)).toBeTruthy();
	});

	test("booking stats view access @api", async () => {
		const supabaseUrl = e2eConfig.supabaseUrl;
		const serviceKey = e2eConfig.supabaseServiceKey;

		if (!supabaseUrl || !serviceKey) {
			test.skip(true, "Set SUPABASE_SERVICE_ROLE_KEY or E2E_SUPABASE_SERVICE_KEY.");
			return;
		}

		const response = await fetch(
			`${supabaseUrl}/rest/v1/v_booking_stats?select=tenant_id&limit=1`,
			{
				headers: {
					apikey: serviceKey,
					Authorization: `Bearer ${serviceKey}`,
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Booking stats view failed with HTTP ${response.status}`);
		}
		const payload = await response.json();
		expect(Array.isArray(payload)).toBeTruthy();
	});
});
