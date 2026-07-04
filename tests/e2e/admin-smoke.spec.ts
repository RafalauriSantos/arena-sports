import { test, expect } from "@playwright/test";
import { e2eConfig } from "../utils/config";
import { disableServiceWorker } from "../utils/browser";

test.describe("Admin dashboard", () => {
	test("login and open agenda @smoke", async ({ page }) => {
		if (
			!e2eConfig.adminEmail ||
			!e2eConfig.adminPassword ||
			!e2eConfig.supabaseUrl ||
			!e2eConfig.supabaseAnonKey
		) {
			test.skip(
				true,
				"Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, Supabase URL and anon key to run.",
			);
		}

		await disableServiceWorker(page);
		await page.goto("/login", { waitUntil: "networkidle" });

		await page.getByTestId("login-email").fill(e2eConfig.adminEmail || "");
		await page.getByTestId("login-password").fill(e2eConfig.adminPassword || "");
		await page.getByTestId("login-submit").click();

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByRole("button", { name: "Reservas" })).toBeVisible();

		await page.getByRole("button", { name: "Reservas" }).click();
		await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

		await page.getByRole("button", { name: "Semana" }).click();
		await expect(page.getByRole("button", { name: "Semana" })).toBeVisible();
	});

	test("dashboard home uses a focused daily agenda layout", async ({ page }) => {
		if (
			!e2eConfig.adminEmail ||
			!e2eConfig.adminPassword ||
			!e2eConfig.supabaseUrl ||
			!e2eConfig.supabaseAnonKey
		) {
			test.skip(
				true,
				"Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, Supabase URL and anon key to run.",
			);
		}

		await disableServiceWorker(page);
		await page.goto("/login", { waitUntil: "networkidle" });

		await page.getByTestId("login-email").fill(e2eConfig.adminEmail || "");
		await page.getByTestId("login-password").fill(e2eConfig.adminPassword || "");
		await page.getByTestId("login-submit").click();

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(
			page.getByRole("heading", { name: "Agenda de hoje" }),
		).toBeVisible();
		await expect(page.getByText("Operação agora")).toHaveCount(0);
	});
});
