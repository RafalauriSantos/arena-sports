import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
	const location = useLocation();

	useEffect(() => {
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			const hashParams = new URLSearchParams(
				window.location.hash.replace(/^#/, ""),
			);

			const hasRecoverySignal =
				hashParams.get("type") === "recovery" ||
				(searchParams.get("type") === "recovery" && searchParams.has("code")) ||
				searchParams.has("code") ||
				location.pathname.startsWith("/auth/v1/");

			if (
				hashParams.get("error_code") === "otp_expired" ||
				searchParams.get("error_code") === "otp_expired"
			) {
				window.location.replace(
					"/login?mode=forgot-password&reset_error=otp_expired",
				);
				return;
			}

			if (hasRecoverySignal) {
				const suffix = `${window.location.search}${window.location.hash}`;
				window.location.replace(`/reset-password${suffix}`);
				return;
			}
		}
	}, [location.pathname]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted">
			<div className="text-center">
				<h1 className="mb-4 text-4xl font-bold">404</h1>
				<p className="mb-4 text-xl text-muted-foreground">
					Ops! Pagina nao encontrada
				</p>
				<a href="/" className="text-primary underline hover:text-primary/90">
					Voltar para a Home
				</a>
			</div>
		</div>
	);
};

export default NotFound;
