import { test, expect } from "@playwright/test";
import { disableServiceWorker } from "../utils/browser";
import { e2eConfig } from "../utils/config";
import { trackPageIssues } from "../utils/page-issues";

test.describe("Authentication negative paths", () => {
	test("invalid admin login stays on login and shows an error @qa", async ({
		page,
	}) => {
		if (!e2eConfig.supabaseUrl || !e2eConfig.supabaseAnonKey) {
			test.skip(true, "Set Supabase URL and anon key to run auth tests.");
		}

		await disableServiceWorker(page);
		await page.goto("/login", { waitUntil: "networkidle" });

		await page.getByTestId("login-email").fill("qa-invalid-user@example.com");
		await page.getByTestId("login-password").fill("senha-invalida-qa");
		await page.getByTestId("login-submit").click();

		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByRole("alert")).toContainText(
			/invalid|inv[aá]lid|credenciais/i,
		);
		await expect(page.getByTestId("login-submit")).toBeEnabled();
	});

	test("forgot password keeps malformed email in native invalid state @qa", async ({
		page,
	}) => {
		const issues = trackPageIssues(page);
		await disableServiceWorker(page);
		await page.goto("/login?mode=forgot-password", { waitUntil: "networkidle" });

		await page.getByPlaceholder("gestor@arenasys.com").fill("email-invalido");
		await page.getByRole("button", { name: /enviar link/i }).click();

		await expect(page.getByPlaceholder("gestor@arenasys.com")).toHaveJSProperty(
			"validity.valid",
			false,
		);
		await expect(page).toHaveURL(/mode=forgot-password/);
		issues.expectNone();
	});

	test("reset password without recovery token gives a recoverable error @qa", async ({
		page,
	}) => {
		const issues = trackPageIssues(page);
		await disableServiceWorker(page);
		await page.goto("/reset-password", { waitUntil: "networkidle" });

		await expect(
			page.getByText(/Link inv[aá]lido ou expirado/i),
		).toBeVisible();
		await page.getByRole("button", { name: /Solicitar novo link/i }).click();
		await expect(page).toHaveURL(/\/login\?mode=forgot-password/);
		issues.expectNone();
	});
});
