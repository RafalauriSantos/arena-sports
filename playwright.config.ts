import { defineConfig, devices } from "@playwright/test";
import "./tests/utils/env";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5000";
const isCI = !!process.env.CI;
const shouldStartServer = process.env.E2E_START_SERVER === "true";
const enabledProjects = (
	process.env.E2E_BROWSER_PROJECTS || (isCI ? "chromium,firefox,webkit" : "chromium")
)
	.split(",")
	.map((project) => project.trim())
	.filter(Boolean);

const browserProjects = [
	{
		name: "chromium",
		use: { ...devices["Desktop Chrome"] },
	},
	{
		name: "firefox",
		use: { ...devices["Desktop Firefox"] },
	},
	{
		name: "webkit",
		use: { ...devices["Desktop Safari"] },
	},
].filter((project) => enabledProjects.includes(project.name));

export default defineConfig({
	testDir: "./tests",
	testMatch: /.*\.spec\.ts/,
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 2 : undefined,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: browserProjects,
	webServer: shouldStartServer
		? {
				command: "npm run dev",
				url: baseURL,
				reuseExistingServer: !isCI,
				timeout: 120_000,
		  }
		: undefined,
});
