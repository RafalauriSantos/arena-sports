import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	ArrowRight,
	CalendarDays,
	CreditCard,
	Lock,
	CheckCircle2,
	Mail,
	Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function hashHasRecoveryType(): boolean {
	if (typeof window === "undefined") return false;
	const raw = window.location.hash.replace(/^#/, "");
	if (!raw) return false;
	const params = new URLSearchParams(raw);
	return params.get("type") === "recovery";
}

function searchHasRecoveryType(): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get("type") === "recovery";
}

/** PKCE: recuperação pode cair em /login?code=... sem hash type=recovery */
function loginPageHasPkceCode(): boolean {
	if (typeof window === "undefined") return false;
	const path = window.location.pathname;
	if (path !== "/login" && !path.endsWith("/login")) return false;
	return new URLSearchParams(window.location.search).has("code");
}

function isEmailRateLimitMessage(message: string): boolean {
	return /email rate limit exceeded|rate limit|too many requests/i.test(
		message,
	);
}

function isMissingApiKeyMessage(message: string): boolean {
	return /no api key found|apikey request header|invalid api key/i.test(
		message,
	);
}

function toVisibleAuthError(message: string): string {
	return message
		.replace(/\bSupabase\b/gi, "serviço de autenticação")
		.replace(/\bAsaas\b/gi, "serviço de pagamento")
		.replace(/\bAWS\b/gi, "infraestrutura");
}

function extractRetrySeconds(message: string): number {
	const match = message.match(/(\d{1,4})\s*(seconds?|sec|s|minutes?|mins?|m)/i);
	if (!match) return 60;
	const value = Number(match[1]);
	if (!Number.isFinite(value) || value <= 0) return 60;
	const unit = match[2].toLowerCase();
	if (unit.startsWith("m")) return value * 60;
	return value;
}

const authLabelClass =
	"text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--az-ink-soft)]";
const authInputClass =
	"h-12 rounded-lg border-[0.5px] border-[var(--az-line)] bg-white px-3 text-[var(--az-ink)] shadow-none placeholder:text-[var(--az-ink-soft)] focus-visible:border-[var(--az-navy)] focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--az-surface)]";
const authPrimaryButtonClass =
	"h-12 rounded-lg bg-[var(--az-navy)] text-[var(--az-surface)] font-semibold shadow-sm hover:bg-[var(--az-navy)] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--az-surface)]";
const authNoticeClass =
	"rounded-lg border border-[var(--az-line)] bg-[var(--az-turf-soft)] p-3 text-sm font-semibold text-[var(--az-turf)] shadow-sm";
const authErrorClass =
	"rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 shadow-sm";

const Login = () => {
	const passwordRecoveryRef = useRef(false);
	const [mode, setMode] = useState<
		| "signin"
		| "signup"
		| "email-confirmation"
		| "forgot-password"
		| "update-password"
	>("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [arenaName, setArenaName] = useState("");
	const [rememberMe, setRememberMe] = useState(true); // Novo: checkbox "Lembrar-me" (true por padrão)
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [recoveryCooldownSeconds, setRecoveryCooldownSeconds] = useState(0);
	const [signupEmail, setSignupEmail] = useState<string>(""); // Email usado no signup (para mostrar na confirmação)
	const recoveryInFlightRef = useRef(false);
	const location = useLocation();
	const navigate = useNavigate();

	// Carregar último email usado (se houver)
	useEffect(() => {
		const lastEmail = localStorage.getItem("last-login-email");
		if (lastEmail && mode === "signin") {
			setEmail(lastEmail);
			setRememberMe(true);
		}
	}, [mode]);

	useEffect(() => {
		if (recoveryCooldownSeconds <= 0) return;
		const timerId = window.setInterval(() => {
			setRecoveryCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
		}, 1000);
		return () => window.clearInterval(timerId);
	}, [recoveryCooldownSeconds]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const qMode = params.get("mode");
		const sessionExpired = params.get("session_expired");
		const resetError = params.get("reset_error");
		const passwordReset = params.get("password_reset");
		if (qMode === "signup") setMode("signup");
		if (qMode === "signin") setMode("signin");
		if (qMode === "forgot" || qMode === "forgot-password") {
			setMode("forgot-password");
			setError(null);
		}
		if (passwordReset === "1") {
			setMode("signin");
			setError(null);
			setSuccessMessage(
				"Senha redefinida com sucesso. Faça login com a nova senha.",
			);
			const next = new URLSearchParams(location.search);
			next.delete("password_reset");
			const clean =
				location.pathname + (next.toString() ? `?${next.toString()}` : "");
			navigate(clean, { replace: true });
			return;
		}
		if (resetError === "otp_expired") {
			setMode("forgot-password");
			setSuccessMessage(null);
			setError(
				"Seu link de recuperação expirou ou já foi usado. Solicite um novo link.",
			);
			const next = new URLSearchParams(location.search);
			next.delete("reset_error");
			const clean =
				location.pathname + (next.toString() ? `?${next.toString()}` : "");
			navigate(clean, { replace: true });
			return;
		}
		if (sessionExpired === "1") {
			setError(
				"Sua sessão expirou ou o token de renovação é inválido. Faça login novamente.",
			);
			// Remove o parâmetro da URL para não repetir a mensagem ao recarregar
			const next = new URLSearchParams(location.search);
			next.delete("session_expired");
			const clean =
				location.pathname + (next.toString() ? `?${next.toString()}` : "");
			navigate(clean, { replace: true });
		}
	}, [location.pathname, location.search, navigate]);

	// Recuperação: hash/query type=recovery ou evento PASSWORD_RECOVERY (evita redirect antes da UI)
	useEffect(() => {
		const redirectToResetPassword = () => {
			const suffix = `${window.location.search}${window.location.hash}`;
			navigate(`/reset-password${suffix}`, { replace: true });
		};

		if (hashHasRecoveryType() || searchHasRecoveryType()) {
			passwordRecoveryRef.current = true;
			setError(null);
			redirectToResetPassword();
			return;
		}
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY") {
				passwordRecoveryRef.current = true;
				setError(null);
				redirectToResetPassword();
			}
		});
		return () => subscription.unsubscribe();
	}, [navigate]);

	// --- LÓGICA DE SESSÃO MANTIDA ---
	// IMPORTANTE: Não redireciona automaticamente se estiver em modo signup ou email-confirmation
	// (permite que novo usuário crie conta mesmo se houver sessão de outro usuário)
	useEffect(() => {
		const checkSession = async () => {
			if (passwordRecoveryRef.current) return;

			const qp = new URLSearchParams(location.search);
			if (qp.get("mode") === "forgot" || qp.get("mode") === "forgot-password") {
				return;
			}

			// Fluxos de conta / recuperação: não redirecionar para dashboard
			if (
				mode === "signup" ||
				mode === "email-confirmation" ||
				mode === "forgot-password" ||
				mode === "update-password" ||
				hashHasRecoveryType() ||
				searchHasRecoveryType()
			) {
				return;
			}

			// PKCE: sessão pode existir antes do evento PASSWORD_RECOVERY — não redirecionar cedo demais
			if (loginPageHasPkceCode()) {
				await new Promise((r) => setTimeout(r, 400));
			} else {
				await new Promise((r) => setTimeout(r, 0));
			}
			if (passwordRecoveryRef.current) return;

			const { data } = await supabase.auth.getSession();
			if (data?.session?.user) {
				// Verificar se email está confirmado (apenas usuários confirmados podem acessar)
				const user = data.session.user;
				if (!user.email_confirmed_at && user.email) {
					// Email não confirmado - não redireciona, deixa na tela de login
					// O usuário verá erro ao tentar fazer login
					return;
				}

				// Verificar se já completou onboarding
				const { data: profile } = await supabase
					.from("profiles")
					.select("onboarding_completed_at, tenant_id")
					.eq("id", user.id)
					.single();

				// Se já completou onboarding, vai direto pro dashboard
				if (profile?.onboarding_completed_at) {
					navigate("/dashboard", { replace: true });
				} else if (profile?.tenant_id) {
					// Tem tenant mas não completou onboarding → mostra welcome
					navigate("/welcome", { replace: true });
				}
				// Se não tem tenant ainda, deixa na página de login
			}
		};
		checkSession();
	}, [navigate, mode, location.search]);

	const handleSendRecoveryEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		if (recoveryInFlightRef.current) return;
		if (recoveryCooldownSeconds > 0) {
			setError(
				`Aguarde ${recoveryCooldownSeconds}s antes de solicitar um novo link.`,
			);
			return;
		}
		recoveryInFlightRef.current = true;
		setIsLoading(true);
		setError(null);
		setSuccessMessage(null);
		if (!email?.trim() || !email.includes("@")) {
			setError("Digite um email válido.");
			setIsLoading(false);
			return;
		}

		if (!navigator.onLine) {
			setError("Você está sem internet. Conecte-se e tente novamente.");
			setIsLoading(false);
			return;
		}

		try {
			const { error: resetError } = await supabase.auth.resetPasswordForEmail(
				email.trim().toLowerCase(),
				{ redirectTo: "https://arenasys.com.br/reset-password" },
			);

			if (resetError) {
				if (isMissingApiKeyMessage(resetError.message)) {
					setError(
						"Erro temporário de autenticação no navegador. Atualize a página e tente novamente.",
					);
					return;
				}
				if (isEmailRateLimitMessage(resetError.message)) {
					const retryIn = extractRetrySeconds(resetError.message);
					setRecoveryCooldownSeconds(retryIn);
					setError(
						`Muitas tentativas em pouco tempo. Aguarde ${retryIn}s e tente novamente.`,
					);
					return;
				}
				setError(toVisibleAuthError(resetError.message));
				return;
			}

			setRecoveryCooldownSeconds(30);

			setSuccessMessage(
				"Se existir uma conta com este email, enviaremos um link para redefinir a senha. Verifique a caixa de entrada e o spam.",
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Erro de rede";
			if (
				/Failed to fetch|ERR_INTERNET_DISCONNECTED|NetworkError/i.test(message)
			) {
				setError(
					"Sem conexão com a internet. Verifique sua rede e tente novamente.",
				);
			} else if (isMissingApiKeyMessage(message)) {
				setError(
					"Erro temporário de autenticação no navegador. Atualize a página e tente novamente.",
				);
			} else if (isEmailRateLimitMessage(message)) {
				const retryIn = extractRetrySeconds(message);
				setRecoveryCooldownSeconds(retryIn);
				setError(
					`Muitas tentativas em pouco tempo. Aguarde ${retryIn}s e tente novamente.`,
				);
			} else {
				setError(`Erro ao enviar link de recuperação: ${toVisibleAuthError(message)}`);
			}
		} finally {
			setIsLoading(false);
			recoveryInFlightRef.current = false;
		}
	};

	const handleSetNewPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		if (newPassword.length < 6) {
			setError("A nova senha deve ter no mínimo 6 caracteres.");
			setIsLoading(false);
			return;
		}
		if (newPassword !== confirmNewPassword) {
			setError("As senhas não coincidem.");
			setIsLoading(false);
			return;
		}
		const { data, error: updateError } = await supabase.auth.updateUser({
			password: newPassword,
		});
		setIsLoading(false);
		if (updateError) {
			setError(toVisibleAuthError(updateError.message));
			return;
		}
		const user = data.user;
		if (user) {
			const { data: profile } = await supabase
				.from("profiles")
				.select("onboarding_completed_at")
				.eq("id", user.id)
				.single();
			setNewPassword("");
			setConfirmNewPassword("");
			if (window.location.hash) {
				window.history.replaceState(
					null,
					"",
					`${window.location.pathname}${window.location.search}`,
				);
			}
			if (profile?.onboarding_completed_at) {
				navigate("/dashboard", { replace: true });
			} else {
				navigate("/welcome", { replace: true });
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			if (mode === "signin") {
				// Salvar email se "Lembrar-me" estiver marcado
				if (rememberMe) {
					localStorage.setItem("last-login-email", email);
				} else {
					localStorage.removeItem("last-login-email");
				}

				const { data: signInData, error } =
					await supabase.auth.signInWithPassword({
						email,
						password,
					});

				// Tratar erro específico de email não confirmado
				if (error) {
					const isEmailNotConfirmed =
						/email.*not.*confirmed|confirmation|verify.*email/i.test(
							error.message,
						);
					if (isEmailNotConfirmed) {
						setError(
							"Email não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.",
						);
						setSignupEmail(email);
						setMode("email-confirmation");
						setIsLoading(false);
						return;
					}
					throw error;
				}

				// Login bem-sucedido - verificar onboarding
				const user = signInData?.user;
				if (user) {
					// Usar session do signInData para evitar query extra
					const { data: profile } = await supabase
						.from("profiles")
						.select("onboarding_completed_at")
						.eq("id", user.id)
						.single();

					// Se já completou onboarding, vai direto pro dashboard
					if (profile?.onboarding_completed_at) {
						navigate("/dashboard", { replace: true });
					} else {
						// Primeira vez → mostra welcome
						navigate("/welcome", { replace: true });
					}
				} else {
					navigate("/welcome", { replace: true });
				}
				return;
			}

			// SIGNUP: Validações antes de criar conta
			if (!email || !email.includes("@")) {
				setError("Email inválido. Digite um email válido.");
				setIsLoading(false);
				return;
			}

			if (!password || password.length < 6) {
				setError("Senha deve ter no mínimo 6 caracteres.");
				setIsLoading(false);
				return;
			}

			const businessName = arenaName || "Minha ArenaSys";

			// Construir URL de redirect de forma segura
			const origin = window.location.origin;
			const redirectUrl = `${origin}/welcome`;

			// SIGNUP: Cria conta e mostra mensagem de confirmação
			const { data: signUpData, error } = await supabase.auth.signUp({
				email: email.trim().toLowerCase(),
				password,
				options: {
					data: {
						business_name: businessName,
						app_slug: "arena-sys",
					},
					// emailRedirectTo só é necessário se confirmação estiver habilitada
					// Se der erro 400, pode ser que a URL não esteja nas allowed redirect URLs do Supabase
					emailRedirectTo: redirectUrl,
				},
			});

			// Tratamento específico de erros do signup
			if (error) {
				const errorMsg = error.message.toLowerCase();

				// Email já cadastrado
				if (
					errorMsg.includes("already registered") ||
					errorMsg.includes("user already exists")
				) {
					setError(
						"Este email já está cadastrado. Faça login ou use outro email.",
					);
					setMode("signin");
					setIsLoading(false);
					return;
				}

				// Email inválido
				if (
					errorMsg.includes("invalid email") ||
					errorMsg.includes("email format")
				) {
					setError("Email inválido. Verifique o formato do email.");
					setIsLoading(false);
					return;
				}

				// Senha muito curta
				if (errorMsg.includes("password") && errorMsg.includes("short")) {
					setError("Senha muito curta. Use no mínimo 6 caracteres.");
					setIsLoading(false);
					return;
				}

				// Redirect URL não permitida
				if (
					errorMsg.includes("redirect") ||
					errorMsg.includes("url") ||
					errorMsg.includes("invalid redirect")
				) {
					setError(
						"URL de redirecionamento não configurada. Revise as configurações de autenticação do projeto.",
					);
					console.error(
						"Redirect URL error:",
						error,
						"Tentou usar:",
						redirectUrl,
					);
					setIsLoading(false);
					return;
				}

				// Erro genérico 400 - pode ser várias coisas
				// Verificar se é um erro 400 de várias formas possíveis
				const errorStatus =
					(error as { status?: number; statusCode?: number }).status ||
					(error as { status?: number; statusCode?: number }).statusCode;

				if (errorStatus === 400 || errorMsg.includes("bad request")) {
					console.error("Signup 400 error details:", {
						message: error.message,
						status: errorStatus,
						email: email.trim().toLowerCase(),
						redirectUrl,
						fullError: error,
					});
					// Mostrar mensagem mais útil
					setError(
						`Erro ao criar conta: ${toVisibleAuthError(error.message) || "Verifique se o email é válido e se a senha tem no mínimo 6 caracteres. Se o problema persistir, revise as configurações de autenticação."}`,
					);
					setIsLoading(false);
					return;
				}

				// Outros erros
				throw error;
			}

			// Salvar email para mostrar na tela de confirmação
			setSignupEmail(email);

			// Verificar se precisa confirmar email
			// Se user for null ou session for null, significa que precisa confirmar email
			if (!signUpData?.user || !signUpData?.session) {
				// Email de confirmação foi enviado - mostra tela de verificar email
				setError(null);
				setIsLoading(false);
				setMode("email-confirmation");
				return;
			}

			// Se sessão foi criada imediatamente (email confirmations desabilitado),
			// vai direto para welcome
			navigate("/welcome", { replace: true });
			return;
		} catch (err: unknown) {
			let message = "Erro de autenticação";

			if (err instanceof Error) {
				message = err.message;

				// Tratamento específico de erros comuns
				const errorLower = message.toLowerCase();

				if (errorLower.includes("network") || errorLower.includes("fetch")) {
					message =
						"Erro de conexão. Verifique sua internet e tente novamente.";
				} else if (
					errorLower.includes("invalid credentials") ||
					errorLower.includes("wrong password")
				) {
					message = "Email ou senha incorretos. Verifique e tente novamente.";
				} else if (
					errorLower.includes("too many requests") ||
					errorLower.includes("rate limit")
				) {
					message =
						"Muitas tentativas. Aguarde alguns minutos e tente novamente.";
				} else if (errorLower.includes("email")) {
					// Manter mensagem original se já foi tratada acima
					if (
						!message.includes("já está cadastrado") &&
						!message.includes("inválido")
					) {
						message = `Erro relacionado ao email: ${message}`;
					}
				}
			}

			setError(toVisibleAuthError(message));
			console.error("Auth error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="login-light auth-landing-auth min-h-screen w-full overflow-hidden bg-[var(--az-navy)] text-[var(--az-ink)] selection:bg-[var(--az-navy-soft)] selection:text-[var(--az-navy)]">
			<div className="relative z-10 flex min-h-[100dvh] w-full flex-col">
				<header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-4 sm:px-8">
					<button
						type="button"
						onClick={() => navigate("/")}
						className="group inline-flex items-center gap-3 rounded-lg py-1.5 text-left transition hover:-translate-y-0.5">
						<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--az-surface)] text-sm font-semibold text-[var(--az-navy)] shadow-sm">
							AS
						</span>
						<span className="leading-none">
							<span className="block text-base font-semibold tracking-tight text-[var(--az-surface)]">
								ArenaSys
							</span>
						</span>
					</button>

					<button
						type="button"
						onClick={() => navigate("/")}
						className="rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--az-navy)] shadow-sm transition hover:bg-[var(--az-paper)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-surface)]/20">
						Voltar ao site
					</button>
				</header>

				<main className="mx-auto grid w-full max-w-[1120px] flex-1 grid-cols-1 items-start gap-7 px-5 pb-8 pt-1 sm:px-8 lg:min-h-[640px] lg:grid-cols-[minmax(500px,540px)_minmax(420px,460px)] lg:items-center lg:justify-center lg:gap-8 lg:pb-8 lg:pt-0">
					<section className="auth-goomer hidden animate-in fade-in slide-in-from-left-6 duration-700 lg:flex lg:min-h-[600px] lg:flex-col lg:justify-center">
						<div className="flex min-h-[640px] w-full flex-col rounded-lg border-[0.5px] border-[var(--az-line)] bg-[var(--az-surface)] p-6 shadow-[0_30px_90px_-56px_rgba(0,0,0,0.68)]">
							<div className="mb-5 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--az-navy)] text-sm font-semibold text-[var(--az-surface)]">
										AS
									</div>
									<div>
										<p className="text-sm font-semibold text-[var(--az-ink)]">
											ArenaSys
										</p>
										<p className="text-xs text-[var(--az-ink-soft)]">
											Central da arena
										</p>
									</div>
								</div>
								<span
									aria-label="Status ativo"
									className="h-2.5 w-2.5 rounded-full bg-[var(--az-turf)] shadow-[0_0_0_6px_var(--az-turf-soft)]"
								/>
							</div>

							<h1 className="auth-hero-title max-w-[430px] text-[38px] font-semibold leading-[1] text-[var(--az-ink)]">
								Sua arena pronta para entrar em quadra.
							</h1>

							<p className="mt-3 max-w-[420px] text-sm font-medium leading-6 text-[var(--az-ink-soft)]">
								Uma visão limpa da operação para entrar, conferir a agenda e
								seguir o dia sem ruído.
							</p>

							<div className="mt-5 grid grid-cols-3 gap-3">
								{[
									{ label: "Reservas hoje", value: "18", tone: "default" },
									{ label: "Ocupação", value: "72%", tone: "default" },
									{ label: "Pendências", value: "3", tone: "pending" },
								].map((item) => (
									<div
										key={item.label}
										className="rounded-lg border-[0.5px] border-[var(--az-line)] bg-[var(--az-paper)] p-3">
										<p
											className={`text-[24px] font-semibold leading-none ${item.tone === "pending" ? "text-[var(--az-clay)]" : "text-[var(--az-ink)]"}`}>
											{item.value}
										</p>
										<p className="mt-2 text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--az-ink-soft)]">
											{item.label}
										</p>
									</div>
								))}
							</div>

							<div className="mt-5 overflow-hidden rounded-lg border-[0.5px] border-[var(--az-line)] bg-[var(--az-surface)]">
								<div className="flex items-center justify-between border-b-[0.5px] border-[var(--az-line)] bg-[var(--az-paper)] px-4 py-3">
									<div>
										<p className="text-base font-semibold text-[var(--az-ink)]">
											Hoje na arena
										</p>
										<p className="mt-1 text-xs text-[var(--az-ink-soft)]">
											Sábado, 04 jul
										</p>
									</div>
									<span
										aria-label="Agenda ativa"
										className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--az-turf-soft)]">
										<span className="h-1.5 w-1.5 rounded-full bg-[var(--az-turf)]" />
									</span>
								</div>

								<div className="grid gap-2 p-3">
									{[
										{
											icon: CalendarDays,
											label: "Próxima reserva",
											value: "19:00 · Quadra 2",
											tone: "default",
										},
										{
											icon: Users,
											label: "Cliente",
											value: "Mensalista confirmado",
											tone: "default",
										},
										{
											icon: CreditCard,
											label: "Pagamento",
											value: "Sinal pendente",
											tone: "pending",
										},
									].map((item) => (
										<div
											key={item.label}
											className="flex items-center gap-3 rounded-lg border-[0.5px] border-[var(--az-line)] bg-[var(--az-paper)] px-3 py-2.5">
											<div
												className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.tone === "pending" ? "bg-[var(--az-clay-soft)] text-[var(--az-clay)]" : "bg-[var(--az-navy-soft)] text-[var(--az-navy)]"}`}>
												<item.icon className="h-4 w-4" />
											</div>
											<div className="min-w-0">
												<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--az-ink-soft)]">
													{item.label}
												</p>
												<p
													className={`truncate text-sm font-semibold ${item.tone === "pending" ? "text-[var(--az-clay)]" : "text-[var(--az-ink)]"}`}>
													{item.value}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</section>

					<section className="flex w-full justify-center animate-in fade-in slide-in-from-right-6 duration-700 delay-150 lg:min-h-[620px] lg:items-center">
						<div className="relative mx-auto w-full max-w-[460px]">
							<div className="auth-login-card relative min-h-[580px] overflow-hidden rounded-lg border-[0.5px] border-[var(--az-line)] bg-[var(--az-surface)] p-6 shadow-[0_30px_90px_-56px_rgba(0,0,0,0.68)] sm:min-h-[640px] sm:p-9">
								<div className="relative">
								{mode === "email-confirmation" ?
									<div className="space-y-5 text-center animate-in fade-in slide-in-from-bottom-4">
										<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--az-line)] bg-[var(--az-navy-soft)] text-[var(--az-navy)] shadow-inner">
											<Mail className="h-8 w-8" />
										</div>

										<div>
											<h2 className="text-2xl font-semibold tracking-tight text-[var(--az-ink)]">
												Confirme seu email
											</h2>
											<p className="mt-2 text-sm leading-6 text-slate-600">
												Enviamos o link para:
											</p>
											<p className="mt-1 break-all text-sm font-semibold text-[var(--az-navy)]">
												{signupEmail || email}
											</p>
										</div>

										{successMessage && (
											<div className={authNoticeClass}>{successMessage}</div>
										)}

										{error && <div className={authErrorClass}>{error}</div>}

										<div className="space-y-3 rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] p-4 text-left">
											{[
												"Abra sua caixa de entrada e clique no link de confirmação.",
												"Se não encontrar, confira spam ou lixo eletrônico.",
												"Depois de confirmar, volte para fazer login na central.",
											].map((item) => (
												<div key={item} className="flex items-start gap-3">
													<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--az-turf)]" />
													<p className="text-sm leading-6 text-[var(--az-ink-soft)]">{item}</p>
												</div>
											))}
										</div>

										<div className="grid gap-3 pt-1">
											<Button
												onClick={async () => {
													setIsLoading(true);
													setError(null);
													setSuccessMessage(null);
													const targetEmail = signupEmail || email;
													const { error: resendError } =
														await supabase.auth.resend({
															type: "signup",
															email: targetEmail,
															options: {
																emailRedirectTo: `${window.location.origin}/welcome`,
															},
														});
													setIsLoading(false);
													if (resendError) {
														setError(
															toVisibleAuthError(resendError.message) ||
																"Erro ao reenviar email. Tente novamente.",
														);
														setSuccessMessage(null);
													} else {
														setError(null);
														setSuccessMessage(
															"Email reenviado com sucesso. Verifique sua caixa de entrada.",
														);
														setTimeout(() => {
															setSuccessMessage(null);
														}, 5000);
													}
												}}
												disabled={isLoading}
												variant="outline"
												className="h-12 rounded-lg border-[var(--az-line)] bg-[var(--az-surface)] text-[var(--az-navy)] hover:bg-[var(--az-paper)]">
												{isLoading ? "Enviando..." : "Reenviar email"}
											</Button>
											<Button
												onClick={() => {
													setMode("signin");
													setEmail(signupEmail || email);
													setSignupEmail("");
													setError(null);
													setSuccessMessage(null);
												}}
												className={authPrimaryButtonClass}>
												Tentar login novamente
											</Button>
										</div>

										<button
											type="button"
											aria-label="Ir para página de login"
											onClick={() => setMode("signin")}
											className="text-sm font-semibold text-[var(--az-ink-soft)] transition hover:text-[var(--az-navy)]">
											Já confirmei, voltar ao login
										</button>
									</div>
								: mode === "forgot-password" ?
									<div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
										<div className="text-center">
											<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--az-line)] bg-[var(--az-navy-soft)] text-[var(--az-navy)] shadow-inner">
												<Lock className="h-8 w-8" />
											</div>
											<h2 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--az-ink)]">
												Redefinir senha
											</h2>
											<p className="mt-2 text-sm leading-6 text-[var(--az-ink-soft)]">
												Informe o email da sua conta e enviaremos um link seguro
												para criar uma nova senha.
											</p>
										</div>

										{successMessage && (
											<div className={authNoticeClass}>{successMessage}</div>
										)}
										{error && <div className={authErrorClass}>{error}</div>}

										<form
											onSubmit={handleSendRecoveryEmail}
											className="space-y-4 text-left">
											<div className="space-y-2">
												<Label className={authLabelClass}>Email</Label>
												<Input
													type="email"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													autoComplete="email"
													required
													className={authInputClass}
													placeholder="gestor@arenasys.com"
												/>
											</div>
											<Button
												type="submit"
												disabled={isLoading || recoveryCooldownSeconds > 0}
												className={authPrimaryButtonClass}>
												{isLoading ?
													"Enviando..."
												: recoveryCooldownSeconds > 0 ?
													`Aguarde ${recoveryCooldownSeconds}s`
												:	"Enviar link"}
											</Button>
											{recoveryCooldownSeconds > 0 && (
													<p className="text-center text-xs text-[var(--az-ink-soft)]">
													Para evitar bloqueio temporário, tente novamente em{" "}
													{recoveryCooldownSeconds}s.
												</p>
											)}
										</form>
										<button
											type="button"
											onClick={() => {
												setMode("signin");
												setError(null);
												setSuccessMessage(null);
											}}
											className="w-full text-sm font-semibold text-[var(--az-navy)] transition hover:text-[var(--az-navy)]">
											Voltar ao login
										</button>
									</div>
								: mode === "update-password" ?
									<div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
										<div className="text-center">
											<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--az-line)] bg-[var(--az-navy-soft)] text-[var(--az-navy)] shadow-inner">
												<Lock className="h-8 w-8" />
											</div>
											<h2 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--az-ink)]">
												Nova senha
											</h2>
											<p className="mt-2 text-sm leading-6 text-[var(--az-ink-soft)]">
												Escolha uma senha forte para proteger a central da arena.
											</p>
										</div>
										{error && <div className={authErrorClass}>{error}</div>}
										<form
											onSubmit={handleSetNewPassword}
											className="space-y-4 text-left">
											<div className="space-y-2">
												<Label className={authLabelClass}>Nova senha</Label>
												<Input
													type="password"
													value={newPassword}
													onChange={(e) => setNewPassword(e.target.value)}
													autoComplete="new-password"
													minLength={6}
													required
													className={authInputClass}
													placeholder="Mínimo 6 caracteres"
												/>
											</div>
											<div className="space-y-2">
												<Label className={authLabelClass}>Confirmar senha</Label>
												<Input
													type="password"
													value={confirmNewPassword}
													onChange={(e) =>
														setConfirmNewPassword(e.target.value)
													}
													autoComplete="new-password"
													minLength={6}
													required
													className={authInputClass}
													placeholder="Repita a senha"
												/>
											</div>
											<Button
												type="submit"
												disabled={isLoading}
												className={authPrimaryButtonClass}>
												{isLoading ? "Salvando..." : "Salvar nova senha"}
											</Button>
										</form>
									</div>
								:	<>
										<div className="mb-8 pt-1">
											<h2 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--az-ink)]">
												{mode === "signin" ?
													"Entrar na ArenaSys"
												:	"Criar conta ArenaSys"}
											</h2>
											<p className="mt-3 max-w-[330px] text-[15px] font-medium leading-6 text-[var(--az-ink-soft)]">
												{mode === "signin" ?
													"Continue de onde parou e acompanhe a operação com calma."
												:	"Comece com uma central limpa para agenda, clientes e caixa."}
											</p>
										</div>

										<div className="mb-6 grid grid-cols-2 rounded-lg border-[0.5px] border-[var(--az-line)] bg-[var(--az-paper)] p-1.5">
											<button
												type="button"
												onClick={() => {
													setMode("signin");
													setError(null);
													setSuccessMessage(null);
												}}
												className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
													mode === "signin" ?
														"bg-[var(--az-navy)] text-[var(--az-surface)] shadow-sm"
													:	"text-[var(--az-ink-soft)] hover:text-[var(--az-ink)]"
												}`}>
												Entrar
											</button>
											<button
												type="button"
												onClick={() => {
													setMode("signup");
													setError(null);
													setSuccessMessage(null);
												}}
												className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
													mode === "signup" ?
														"bg-[var(--az-navy)] text-[var(--az-surface)] shadow-sm"
													:	"text-[var(--az-ink-soft)] hover:text-[var(--az-ink)]"
												}`}>
												Criar conta
											</button>
										</div>

										<form onSubmit={handleSubmit} className="space-y-5">
											{mode === "signup" && (
												<div className="space-y-2">
													<Label className={authLabelClass}>Nome da arena</Label>
													<Input
														value={arenaName}
														onChange={(e) => setArenaName(e.target.value)}
														autoComplete="organization"
														className={authInputClass}
														placeholder="Ex: ArenaSys Tatuí"
													/>
												</div>
											)}

											<div className="space-y-2">
												<Label className={authLabelClass}>Email corporativo</Label>
												<Input
													type="email"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													data-testid="login-email"
													autoComplete="email"
													className={authInputClass}
													placeholder="gestor@arenasys.com"
												/>
											</div>

											<div className="space-y-2">
												<Label className={authLabelClass}>Senha de acesso</Label>
												<Input
													type="password"
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													data-testid="login-password"
													autoComplete={
														mode === "signin" ? "current-password" : (
															"new-password"
														)
													}
													className={authInputClass}
													placeholder="••••••••"
												/>
											</div>

											{mode === "signin" && (
												<div className="flex justify-end">
													<button
														type="button"
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															setMode("forgot-password");
															setError(null);
															setSuccessMessage(null);
														}}
														className="text-xs font-semibold text-[var(--az-navy)] transition hover:text-[var(--az-navy)]">
														Esqueceu a senha?
													</button>
												</div>
											)}

											{mode === "signin" && (
												<button
													type="button"
													aria-pressed={rememberMe}
													onClick={() => setRememberMe(!rememberMe)}
													className="flex w-full items-center gap-3 rounded-lg border-[0.5px] border-[var(--az-line)] bg-[var(--az-paper)] p-4 text-left transition hover:border-[var(--az-navy)]">
													<span
														className={`toggle-premium ${rememberMe ? "active" : ""}`}
													/>
													<span>
														<span className="block text-sm font-semibold text-[var(--az-ink)]">
															Lembrar neste dispositivo
														</span>
														<span className="block text-xs font-medium text-[var(--az-ink-soft)]">
															Mantém o email preenchido no próximo acesso.
														</span>
													</span>
												</button>
											)}

											{error && (
												<div role="alert" className={authErrorClass}>
													{error}
												</div>
											)}

											<Button
												type="submit"
												disabled={isLoading}
												data-testid="login-submit"
												className={`${authPrimaryButtonClass} w-full`}>
												{isLoading ?
													"Conectando..."
												:	<span className="flex items-center justify-center gap-2">
														{mode === "signin" ?
															"Entrar no sistema"
														:	"Criar conta"}
														<ArrowRight className="h-5 w-5" />
													</span>
												}
											</Button>

											{mode === "signup" && (
												<p className="text-center text-xs font-medium text-[var(--az-ink-soft)]">
													7 dias grátis. Sem cartão.
												</p>
											)}
										</form>
									</>
								}
								</div>

								<div className="mt-4 flex items-center justify-center gap-2 border-t-[0.5px] border-[var(--az-line)] pt-3 text-center text-xs font-medium text-[var(--az-ink-soft)]">
									<Lock className="h-3.5 w-3.5 flex-shrink-0" />
									<span>Conexão criptografada · dados privados da sua arena</span>
								</div>
							</div>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
};

export default Login;
