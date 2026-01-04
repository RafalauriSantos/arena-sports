import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

// Auto-refresh on new deployments (PWA): apply update and reload.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
	const updateSW = registerSW({
		immediate: true,
		onNeedRefresh() {
			updateSW(true).then(() => window.location.reload());
		},
		onOfflineReady() {
			// No UI needed.
		},
	});

	// When the new SW takes control, reload to use the new bundles.
	navigator.serviceWorker.addEventListener("controllerchange", () => {
		window.location.reload();
	});

	// When user returns to the tab/app, check for updates.
	window.addEventListener("focus", () => {
		updateSW(false);
	});
}

createRoot(document.getElementById("root")!).render(<App />);
