import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	ArrowRight,
	Lock,
	Zap,
	Trophy,
	ShieldCheck,
	CheckCircle2,
	Mail,
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
	const [signupEmail, setSignupEmail] = useState<string>(""); // Email usado no signup (para mostrar na confirmação)
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
		const params = new URLSearchParams(location.search);
		const qMode = params.get("mode");
		const sessionExpired = params.get("session_expired");
		const resetError = params.get("reset_error");
		if (qMode === "signup") setMode("signup");
		if (qMode === "signin") setMode("signin");
		if (qMode === "forgot" || qMode === "forgot-password") {
			setMode("forgot-password");
			setError(null);
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
				setError(resetError.message);
				return;
			}

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
			} else {
				setError(`Erro ao enviar link de recuperação: ${message}`);
			}
		} finally {
			setIsLoading(false);
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
			setError(updateError.message);
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
						"URL de redirecionamento não configurada. Configure a URL permitida no Supabase Dashboard (Authentication > URL Configuration > Redirect URLs).",
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
						`Erro ao criar conta: ${error.message || "Verifique se o email é válido e se a senha tem no mínimo 6 caracteres. Se o problema persistir, verifique as configurações de redirect URL no Supabase."}`,
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

			setError(message);
			console.error("Auth error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex bg-[#02040a] text-white relative overflow-hidden font-sans selection:bg-emerald-500/30">
			{/* 1. FUNDO IMERSIVO - FIXED para evitar espaço extra no mobile */}
			<div className="fixed inset-0 z-0">
				{/* Imagem de fundo de alta qualidade (Esportes) */}
				<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0565c6d?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center" />
				{/* Gradiente pesado para escurecer e focar no conteúdo */}
				<div className="absolute inset-0 bg-gradient-to-r from-[#02040a] via-[#02040a]/95 to-[#02040a]/40" />
				{/* Efeito de granulação (Noise) para textura premium */}
				<div
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
					}}
				/>
			</div>

			{/* 2. CONTEÚDO PRINCIPAL (Z-Index alto) */}
			<div className="relative z-10 w-full max-w-md sm:max-w-xl lg:max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between px-1 sm:px-4 py-3 sm:py-8 lg:py-0 h-full min-h-[100dvh] gap-4 sm:gap-8 lg:gap-10">
				{/* ESQUERDA: Copy de Vendas Agressiva */}
				<div className="w-full lg:w-1/2 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-left-10 duration-700">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold tracking-wide uppercase shadow-[0_0_20px_rgba(16,185,129,0.2)]">
						<Zap className="w-4 h-4 fill-emerald-400" />
						Sistema de Alta Performance
					</div>

					<h1 className="text-2xl sm:text-4xl lg:text-6xl font-black tracking-tight leading-[1.1]">
						Transforme horários vazios em{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
							lucro automático.
						</span>
					</h1>

					<p className="text-sm sm:text-base text-gray-300 max-w-[16rem] sm:max-w-md leading-relaxed">
						Pare de perder dinheiro com horários vagos e gestão manual. O{" "}
						<strong>ArenaSys</strong> é o cérebro que automatiza suas reservas,
						pagamentos e clientes enquanto você dorme.
					</p>

					<div className="flex flex-col sm:flex-row gap-1 sm:gap-2 pt-2">
						<div className="flex items-center gap-3 text-gray-300">
							<CheckCircle2 className="w-5 h-5 text-emerald-500" />
							<span>7 dias grátis para testar</span>
						</div>
						<div className="flex items-center gap-3 text-gray-300">
							<CheckCircle2 className="w-5 h-5 text-emerald-500" />
							<span>Setup em 3 minutos</span>
						</div>
					</div>

					{/* Programa Founders - Prova Social Autêntica */}
					<div className="border-t border-white/10 pt-4 sm:pt-6 mt-4 sm:mt-6">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
							<Zap className="w-3 h-3 fill-emerald-400" />
							Programa Founders - Vagas Limitadas
						</div>
						<p className="text-gray-300 text-sm mt-3 max-w-md">
							Seja um dos primeiros arenas a transformar sua gestão. Condições
							especiais para quem se juntar agora.
						</p>
					</div>
				</div>

				{/* DIREITA: O Card de Login "HUD" */}
				<div className="w-full max-w-[18rem] sm:max-w-xs lg:w-[400px] animate-in fade-in slide-in-from-right-10 duration-700 delay-200">
					<div className="relative group">
						{/* Glow Effect atrás do card */}
						<div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

						<div className="relative bg-[#0a0c10]/90 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/40 hover:shadow-emerald-500/5 transition-shadow duration-300">
							{/* TELA DE CONFIRMAÇÃO DE EMAIL */}
							{mode === "email-confirmation" ?
								<div className="space-y-4 sm:space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
									<div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-2">
										<Mail className="w-8 h-8 text-emerald-400" />
									</div>

									<div>
										<h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
											Conta Criada com Sucesso! 🎉
										</h2>
										<p className="text-gray-300 text-sm">
											Enviamos um email de confirmação para:
										</p>
										<p className="text-emerald-400 font-medium text-sm mt-1 break-all">
											{signupEmail || email}
										</p>
									</div>

									{successMessage && (
										<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
											{successMessage}
										</div>
									)}

									{error && (
										<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
											{error}
										</div>
									)}

									<div className="space-y-3 text-left bg-white/5 rounded-lg p-4 border border-white/10">
										<div className="flex items-start gap-3">
											<CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
											<p className="text-gray-300 text-sm">
												Verifique sua caixa de entrada e clique no link de
												confirmação
											</p>
										</div>
										<div className="flex items-start gap-3">
											<CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
											<p className="text-gray-300 text-sm">
												Não recebeu? Verifique a pasta de <strong>Spam</strong>{" "}
												ou lixo eletrônico
											</p>
										</div>
										<div className="flex items-start gap-3">
											<CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
											<p className="text-gray-300 text-sm">
												Após confirmar, você poderá fazer login e começar a usar
											</p>
										</div>
									</div>

									<div className="flex flex-col gap-3 pt-2">
										<Button
											onClick={async () => {
												// Reenviar email de confirmação
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
														resendError.message ||
															"Erro ao reenviar email. Tente novamente.",
													);
													setSuccessMessage(null);
												} else {
													setError(null);
													setSuccessMessage(
														"✅ Email reenviado com sucesso! Verifique sua caixa de entrada.",
													);
													// Limpar mensagem após 5 segundos
													setTimeout(() => {
														setSuccessMessage(null);
													}, 5000);
												}
											}}
											disabled={isLoading}
											variant="outline"
											className="w-full border-white/20 hover:bg-white/5 text-white">
											{isLoading ? "Enviando..." : "Reenviar Email"}
										</Button>
										<Button
											onClick={async () => {
												// Tentar login novamente após confirmação
												setMode("signin");
												setEmail(signupEmail || email);
												setSignupEmail("");
												setError(null);
												setSuccessMessage(null);
											}}
											className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm sm:text-base">
											Tentar Login Novamente
										</Button>
									</div>

									<p className="text-xs text-gray-300 pt-2">
										Já confirmou?{" "}
										<button
											aria-label="Ir para página de login"
											onClick={() => setMode("signin")}
											className="text-emerald-400 hover:text-emerald-300 underline">
											Fazer login aqui
										</button>
									</p>
								</div>
							: mode === "forgot-password" ?
								<div className="space-y-4 sm:space-y-5 text-center animate-in fade-in slide-in-from-bottom-4">
									<div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-1">
										<Lock className="w-8 h-8 text-emerald-400" />
									</div>
									<div>
										<h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
											Redefinir senha
										</h2>
										<p className="text-gray-300 text-sm text-left">
											Informe o email da sua conta. Enviaremos um link para você
											criar uma nova senha.
										</p>
									</div>
									{successMessage && (
										<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
											{successMessage}
										</div>
									)}
									{error && (
										<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
											{error}
										</div>
									)}
									<form
										onSubmit={handleSendRecoveryEmail}
										className="space-y-4 text-left">
										<div className="space-y-1.5">
											<Label className="text-xs uppercase text-gray-300 font-bold">
												Email
											</Label>
											<div className="relative">
												<ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
												<Input
													type="email"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													autoComplete="email"
													required
													className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10]"
													placeholder="gestor@arenasys.com"
												/>
											</div>
										</div>
										<Button
											type="submit"
											disabled={isLoading}
											className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold">
											{isLoading ? "Enviando..." : "Enviar link"}
										</Button>
									</form>
									<button
										type="button"
										onClick={() => {
											setMode("signin");
											setError(null);
											setSuccessMessage(null);
										}}
										className="text-sm text-gray-300 hover:text-white underline">
										Voltar ao login
									</button>
								</div>
							: mode === "update-password" ?
								<div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4">
									<div className="text-center">
										<div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-2">
											<Lock className="w-8 h-8 text-emerald-400" />
										</div>
										<h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
											Nova senha
										</h2>
										<p className="text-gray-300 text-sm">
											Escolha uma senha forte para sua conta.
										</p>
									</div>
									{error && (
										<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
											{error}
										</div>
									)}
									<form
										onSubmit={handleSetNewPassword}
										className="space-y-3 text-left">
										<div className="space-y-1.5">
											<Label className="text-xs uppercase text-gray-300 font-bold">
												Nova senha
											</Label>
											<div className="relative">
												<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
												<Input
													type="password"
													value={newPassword}
													onChange={(e) => setNewPassword(e.target.value)}
													autoComplete="new-password"
													minLength={6}
													required
													className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10]"
													placeholder="Mínimo 6 caracteres"
												/>
											</div>
										</div>
										<div className="space-y-1.5">
											<Label className="text-xs uppercase text-gray-300 font-bold">
												Confirmar senha
											</Label>
											<div className="relative">
												<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
												<Input
													type="password"
													value={confirmNewPassword}
													onChange={(e) =>
														setConfirmNewPassword(e.target.value)
													}
													autoComplete="new-password"
													minLength={6}
													required
													className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10]"
													placeholder="Repita a senha"
												/>
											</div>
										</div>
										<Button
											type="submit"
											disabled={isLoading}
											className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold">
											{isLoading ? "Salvando..." : "Salvar nova senha"}
										</Button>
									</form>
								</div>
							:	<>
									<div className="text-center mb-4 sm:mb-6">
										<h2 className="text-lg sm:text-xl font-bold text-white">
											{mode === "signin" ? "Acessar Central" : "Começar Agora"}
										</h2>
										<p className="text-gray-300 text-[11px] sm:text-xs mt-1">
											{mode === "signin" ?
												"Digite suas credenciais de gestor."
											:	"Crie sua conta em 30 segundos."}
										</p>
									</div>

									<form
										onSubmit={handleSubmit}
										className="space-y-2.5 sm:space-y-4">
										{mode === "signup" && (
											<div className="space-y-1 sm:space-y-1.5">
												<Label className="text-xs uppercase text-gray-300 font-bold">
													Nome da Arena
												</Label>
												<div className="relative">
													<Trophy className="absolute left-3 top-3 h-5 w-5 text-gray-300" />
													<Input
														value={arenaName}
														onChange={(e) => setArenaName(e.target.value)}
														autoComplete="organization"
														className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10] transition-all duration-200"
														placeholder="Ex: ArenaSys Tatuí"
													/>
												</div>
											</div>
										)}

										<div className="space-y-1 sm:space-y-1.5">
											<Label className="text-xs uppercase text-gray-300 font-bold">
												Email Corporativo
											</Label>
											<div className="relative">
												<ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
												<Input
													type="email"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													autoComplete="email"
													className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10] transition-all duration-200"
													placeholder="gestor@arenasys.com"
												/>
											</div>
										</div>

										<div className="space-y-1 sm:space-y-1.5">
											<Label className="text-xs uppercase text-gray-300 font-bold">
												Senha de Acesso
											</Label>
											<div className="relative">
												<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
												<Input
													type="password"
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													autoComplete={
														mode === "signin" ? "current-password" : (
															"new-password"
														)
													}
													className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10] transition-all duration-200"
													placeholder="••••••••"
												/>
											</div>
										</div>

										{mode === "signin" && (
											<div className="flex justify-end -mt-0.5">
												<button
													type="button"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setMode("forgot-password");
														setError(null);
														setSuccessMessage(null);
													}}
													className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
													Esqueceu a senha?
												</button>
											</div>
										)}

										{/* Checkbox "Lembrar-me" Premium Toggle */}
										{mode === "signin" && (
											<div
												className="flex items-center gap-3 py-2 cursor-pointer group"
												onClick={() => setRememberMe(!rememberMe)}>
												<div
													className={`toggle-premium ${rememberMe ? "active" : ""}`}
												/>
												<label className="text-sm text-gray-300 cursor-pointer select-none group-hover:text-white transition-colors">
													Lembrar-me neste dispositivo
												</label>
											</div>
										)}

										{error && (
											<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
												{error}
											</div>
										)}

										<Button
											type="submit"
											disabled={isLoading}
											className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold text-sm sm:text-base shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-200 transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10]">
											{isLoading ?
												"Conectando..."
											:	<span className="flex items-center gap-2">
													{mode === "signin" ?
														"Entrar no Sistema"
													:	"Liberar Meu Acesso"}
													<ArrowRight className="w-5 h-5" />
												</span>
											}
										</Button>
									</form>

									<div className="mt-2 sm:mt-4 text-center">
										<button
											aria-label="Alternar entre login e cadastro"
											onClick={() => {
												setMode(mode === "signin" ? "signup" : "signin");
												setError(null);
												setSuccessMessage(null);
												setSignupEmail("");
												setNewPassword("");
												setConfirmNewPassword("");
											}}
											className="text-sm text-gray-300 hover:text-white transition-colors">
											{mode === "signin" ?
												"Não tem conta? Criar acesso grátis"
											:	"Já tem conta? Fazer login"}
										</button>
									</div>
								</>
							}
						</div>

						{/* Selo de Segurança */}
						<div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 text-[9px] sm:text-[10px] text-gray-300 opacity-60">
							<Lock className="w-3 h-3" />
							<span>Criptografia de ponta a ponta (SSL)</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
