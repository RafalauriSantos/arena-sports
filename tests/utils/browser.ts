import type { Page } from "@playwright/test";

export const disableServiceWorker = async (page: Page) => {
	await page.addInitScript(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				registrations.forEach((registration) => registration.unregister());
			});
		}
	});
};
