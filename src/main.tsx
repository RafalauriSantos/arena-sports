import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

const isResetPasswordPath = (pathname: string) =>
	pathname === "/reset-password" || pathname === "/reset-password/";

const redirectRecoveryBeforeAppBoot = (): boolean => {
	if (typeof window === "undefined") return false;

	const { pathname, search, hash } = window.location;
	const searchParams = new URLSearchParams(search);
	const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

	const hasCode = searchParams.has("code");
	const isRecoveryType =
		hashParams.get("type") === "recovery" ||
		searchParams.get("type") === "recovery";
	const hasExpiredOtp =
		hashParams.get("error_code") === "otp_expired" ||
		searchParams.get("error_code") === "otp_expired";

	if (hasExpiredOtp && !pathname.startsWith("/login")) {
		window.location.replace(
			"/login?mode=forgot-password&reset_error=otp_expired",
		);
		return true;
	}

	if ((hasCode || isRecoveryType) && !isResetPasswordPath(pathname)) {
		window.location.replace(`/reset-password${search}${hash}`);
		return true;
	}

	return false;
};

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

if (!redirectRecoveryBeforeAppBoot()) {
	createRoot(document.getElementById("root")!).render(<App />);
}
