import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

// WCAG AA: Fix viewport for accessibility (ensure zoom is allowed)
const fixViewportForAccessibility = () => {
	const viewport = document.querySelector('meta[name="viewport"]');
	if (viewport) {
		const content = viewport.getAttribute("content") || "";
		// Remove user-scalable=no and set maximum-scale=5.0
		const fixedContent = content
			.replace(/user-scalable\s*=\s*no/gi, "")
			.replace(/maximum-scale\s*=\s*[\d.]+/gi, "maximum-scale=5.0")
			.replace(/,\s*,/g, ",")
			.replace(/,\s*$/g, "")
			.trim();

		if (!fixedContent.includes("maximum-scale")) {
			viewport.setAttribute("content", fixedContent + ", maximum-scale=5.0");
		} else {
			viewport.setAttribute("content", fixedContent);
		}
	}
};
fixViewportForAccessibility();

// Auto-refresh on new deployments (PWA): apply update and reload.
// Com injectRegister: 'auto', o VitePWA já registra automaticamente,
// mas mantemos o controle manual para melhor UX
if (import.meta.env.PROD && "serviceWorker" in navigator) {
	const updateSW = registerSW({
		immediate: true,
		onNeedRefresh() {
			// Atualiza silenciosamente em background
			updateSW(true).then(() => {
				// Recarrega apenas quando o SW estiver pronto
				if (navigator.serviceWorker.controller) {
					window.location.reload();
				}
			});
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
