import { expect, type Page } from "@playwright/test";

const ignoredConsoleErrorPatterns = [
	/Failed to load resource/i,
	/404 Error: User attempted to access non-existent route/i,
];

export const trackPageIssues = (page: Page) => {
	const issues: string[] = [];

	page.on("pageerror", (error) => {
		issues.push(`pageerror: ${error.message}`);
	});

	page.on("console", (message) => {
		if (message.type() !== "error") return;

		const text = message.text();
		if (ignoredConsoleErrorPatterns.some((pattern) => pattern.test(text))) {
			return;
		}

		issues.push(`console.error: ${text}`);
	});

	return {
		expectNone: () => expect(issues).toEqual([]),
	};
};

export const expectNoHorizontalOverflow = async (page: Page) => {
	const hasOverflow = await page.evaluate(() => {
		const root = document.documentElement;
		return root.scrollWidth > root.clientWidth + 2;
	});

	expect(hasOverflow).toBeFalsy();
};
