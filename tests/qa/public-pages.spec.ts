import { test, expect } from "@playwright/test";
import { disableServiceWorker } from "../utils/browser";
import { expectNoHorizontalOverflow, trackPageIssues } from "../utils/page-issues";

const publicRoutes = [
	{ path: "/", heading: /A agenda da sua arena/i },
	{ path: "/about", heading: /Libertar donos de arena/i },
	{ path: "/support", heading: /Central de Suporte/i },
	{ path: "/privacy", heading: /Pol[ií]tica de Privacidade/i },
	{ path: "/terms", heading: /Termos de Servi[cç]o/i },
	{ path: "/blog", heading: /Blog ArenaSys/i },
	{ path: "/software-quadras-futebol", heading: /Software para Gest[aã]o de Quadras/i },
	{ path: "/sistema-beach-tennis", heading: /Sistema de Gest[aã]o para Quadras de Beach Tennis/i },
	{ path: "/gestao-quadra-society", heading: /Sistema de Gest[aã]o Completo para Quadra Society/i },
];

for (const route of publicRoutes) {
	test(`public route renders without critical errors: ${route.path} @qa`, async ({
		page,
	}) => {
		const issues = trackPageIssues(page);
		await disableServiceWorker(page);

		await page.goto(route.path, { waitUntil: "domcontentloaded" });

		await expect(
			page.getByRole("heading", { level: 1, name: route.heading }),
		).toBeVisible();
		await expect(page).not.toHaveTitle("");
		await expect(page.getByText(/Erro inesperado/i)).toHaveCount(0);
		await expectNoHorizontalOverflow(page);
		issues.expectNone();
	});
}

test("landing mobile menu navigates to login @qa", async ({ page }) => {
	const issues = trackPageIssues(page);
	await disableServiceWorker(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/", { waitUntil: "domcontentloaded" });

	await page.getByRole("button", { name: /abrir menu/i }).click();
	await page.getByRole("button", { name: /fazer login/i }).click();

	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByTestId("login-email")).toBeVisible();
	await expectNoHorizontalOverflow(page);
	issues.expectNone();
});

test("unknown route shows 404 and returns home @qa", async ({ page }) => {
	await disableServiceWorker(page);
	await page.goto("/rota-inexistente-qa", { waitUntil: "domcontentloaded" });

	await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
	await page
		.getByRole("link", { name: /return to home|voltar para a home/i })
		.click();
	await expect(page).toHaveURL(/\/$/);
});
