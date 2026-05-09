import { test, expect } from "@playwright/test";
import { e2eConfig } from "../utils/config";
import { disableServiceWorker } from "../utils/browser";

test.describe("Public booking", () => {
	test("validation flow @smoke", async ({ page }) => {
		const subdomain = e2eConfig.publicSubdomain;
		if (!subdomain || !e2eConfig.supabaseUrl || !e2eConfig.supabaseAnonKey) {
			test.skip(
				true,
				"Set E2E_PUBLIC_SUBDOMAIN, Supabase URL and anon key to run this test.",
			);
		}

		await disableServiceWorker(page);
		await page.goto(`/agendar/${subdomain}`, { waitUntil: "networkidle" });

		const availableSlots = page.locator('[data-testid="slot-available"]');
		if ((await availableSlots.count()) === 0) {
			test.skip(true, "No available slots for the selected date.");
		}

		await availableSlots.first().click();
		await page.getByRole("button", { name: "Reservar Agora" }).click();

		await expect(page.getByTestId("booking-modal")).toBeVisible();
		await page
			.getByRole("button", { name: /Reservar e Pagar no Balc[aã]o/i })
			.click();
		await expect(
			page.getByText("Por favor, informe seu nome"),
		).toBeVisible();

		await page.getByLabel("Seu nome").fill("Teste QA");
		await page
			.getByRole("button", { name: /Reservar e Pagar no Balc[aã]o/i })
			.click();
		await expect(page.getByText(/telefone v[aá]lido/i)).toBeVisible();

		const duration90Button = page.getByRole("button", { name: "1h30" });
		await duration90Button.click();
		await expect(duration90Button).toHaveAttribute("aria-pressed", "true");
	});

	test("create booking and cleanup @regression @write", async ({ page, request }) => {
		const subdomain = e2eConfig.publicSubdomain;
		const supabaseUrl = e2eConfig.supabaseUrl;
		const serviceKey = e2eConfig.supabaseServiceKey;

		if (
			!subdomain ||
			!supabaseUrl ||
			!e2eConfig.supabaseAnonKey ||
			!serviceKey ||
			!e2eConfig.allowWrite
		) {
			test.skip(true, "Set E2E_ALLOW_WRITE and Supabase keys to run this test.");
		}

		await disableServiceWorker(page);
		await page.goto(`/agendar/${subdomain}`, { waitUntil: "networkidle" });

		const availableSlots = page.locator('[data-testid="slot-available"]');
		if ((await availableSlots.count()) === 0) {
			test.skip(true, "No available slots for the selected date.");
		}

		await availableSlots.first().click();
		await page.getByRole("button", { name: "Reservar Agora" }).click();
		await expect(page.getByTestId("booking-modal")).toBeVisible();

		await page.getByLabel("Seu nome").fill("Teste QA E2E");
		await page.getByLabel("Seu telefone (WhatsApp)").fill("(11) 99988-7766");

		const bookingResponse = page.waitForResponse((response) => {
			return (
				response.url().includes("/rest/v1/bookings") &&
				response.request().method() === "POST"
			);
		});

		await page
			.getByRole("button", { name: /Reservar e Pagar no Balc[aã]o/i })
			.click();

		const response = await bookingResponse;
		const payload = await response.json();
		const bookingId = Array.isArray(payload) ? payload[0]?.id : payload?.id;
		if (!bookingId) {
			throw new Error("Booking id not found in response payload.");
		}

		await expect(page.getByText(/Reserva confirmada!/i)).toBeVisible();

		await request.delete(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
			headers: {
				apikey: serviceKey,
				Authorization: `Bearer ${serviceKey}`,
			},
		});
	});
});
