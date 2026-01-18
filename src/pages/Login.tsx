import { useState, useEffect } from "react";
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

const Login = () => {
	const [mode, setMode] = useState<"signin" | "signup" | "email-confirmation">(
		"signin"
	);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [arenaName, setArenaName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [signupEmail, setSignupEmail] = useState<string>(""); // Email usado no signup (para mostrar na confirmação)
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const qMode = params.get("mode");
		if (qMode === "signup") setMode("signup");
		if (qMode === "signin") setMode("signin");
	}, [location.search]);

	// --- LÓGICA DE SESSÃO MANTIDA ---
	// IMPORTANTE: Não redireciona automaticamente se estiver em modo signup ou email-confirmation
	// (permite que novo usuário crie conta mesmo se houver sessão de outro usuário)
	useEffect(() => {
		const checkSession = async () => {
			// Se estiver em modo signup ou email-confirmation, não redireciona
			if (mode === "signup" || mode === "email-confirmation") {
				return;
			}

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
	}, [navigate, mode]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			if (mode === "signin") {
				const { data: signInData, error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				// Tratar erro específico de email não confirmado
				if (error) {
					const isEmailNotConfirmed = /email.*not.*confirmed|confirmation|verify.*email/i.test(
						error.message
					);
					if (isEmailNotConfirmed) {
						setError(
							"Email não confirmado. Verifique sua caixa de entrada e clique no link de confirmação."
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
				if (errorMsg.includes("already registered") || errorMsg.includes("user already exists")) {
					setError("Este email já está cadastrado. Faça login ou use outro email.");
					setMode("signin");
					setIsLoading(false);
					return;
				}
				
				// Email inválido
				if (errorMsg.includes("invalid email") || errorMsg.includes("email format")) {
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
				if (errorMsg.includes("redirect") || errorMsg.includes("url") || errorMsg.includes("invalid redirect")) {
					setError(
						"URL de redirecionamento não configurada. Configure a URL permitida no Supabase Dashboard (Authentication > URL Configuration > Redirect URLs)."
					);
					console.error("Redirect URL error:", error, "Tentou usar:", redirectUrl);
					setIsLoading(false);
					return;
				}
				
				// Erro genérico 400 - pode ser várias coisas
				// Verificar se é um erro 400 de várias formas possíveis
				const errorStatus = (error as { status?: number; statusCode?: number }).status || 
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
						`Erro ao criar conta: ${error.message || "Verifique se o email é válido e se a senha tem no mínimo 6 caracteres. Se o problema persistir, verifique as configurações de redirect URL no Supabase."}`
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
					message = "Erro de conexão. Verifique sua internet e tente novamente.";
				} else if (errorLower.includes("invalid credentials") || errorLower.includes("wrong password")) {
					message = "Email ou senha incorretos. Verifique e tente novamente.";
				} else if (errorLower.includes("too many requests") || errorLower.includes("rate limit")) {
					message = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
				} else if (errorLower.includes("email")) {
					// Manter mensagem original se já foi tratada acima
					if (!message.includes("já está cadastrado") && !message.includes("inválido")) {
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
			{/* 1. FUNDO IMERSIVO (Imagem de Arena Sports + Overlay) */}
			<div className="absolute inset-0 z-0">
				{/* Imagem de fundo de alta qualidade (Esportes) */}
				<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0565c6d?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center" />
				{/* Gradiente pesado para escurecer e focar no conteúdo */}
				<div className="absolute inset-0 bg-gradient-to-r from-[#02040a] via-[#02040a]/95 to-[#02040a]/40" />
				{/* Efeito de granulação (Noise) para textura premium */}
				<div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
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

					<p className="text-sm sm:text-base text-gray-400 max-w-[16rem] sm:max-w-md leading-relaxed">
						Pare de perder dinheiro com horários vagos e gestão manual. O{" "}
						<strong>ArenaSys</strong> é o cérebro que automatiza suas reservas,
						pagamentos e clientes enquanto você dorme.
					</p>

					<div className="flex flex-col sm:flex-row gap-1 sm:gap-2 pt-2">
						<div className="flex items-center gap-3 text-gray-300">
							<CheckCircle2 className="w-5 h-5 text-emerald-500" />
							<span>Zero mensalidade fixa (teste)</span>
						</div>
						<div className="flex items-center gap-3 text-gray-300">
							<CheckCircle2 className="w-5 h-5 text-emerald-500" />
							<span>Setup em 3 minutos</span>
						</div>
					</div>

					{/* Prova Social (Números) */}
					<div className="grid grid-cols-3 gap-1 sm:gap-4 border-t border-white/10 pt-4 sm:pt-6 mt-4 sm:mt-6 text-center">
						<div>
							<p className="text-3xl font-bold text-white">R$ 1.2M+</p>
							<p className="text-xs text-gray-500 uppercase tracking-widest">
								Processados
							</p>
						</div>
						<div>
							<p className="text-3xl font-bold text-white">15k+</p>
							<p className="text-xs text-gray-500 uppercase tracking-widest">
								Jogos/Mês
							</p>
						</div>
						<div>
							<p className="text-3xl font-bold text-white">4.9/5</p>
							<p className="text-xs text-gray-500 uppercase tracking-widest">
								Avaliação
							</p>
						</div>
					</div>
				</div>

				{/* DIREITA: O Card de Login "HUD" */}
				<div className="w-full max-w-[18rem] sm:max-w-xs lg:w-[400px] animate-in fade-in slide-in-from-right-10 duration-700 delay-200">
					<div className="relative group">
						{/* Glow Effect atrás do card */}
						<div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

						<div className="relative bg-[#0a0c10]/90 backdrop-blur-2xl border border-white/10 p-2 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xl">
							{/* TELA DE CONFIRMAÇÃO DE EMAIL */}
							{mode === "email-confirmation" ? (
								<div className="space-y-4 sm:space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
									<div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-2">
										<Mail className="w-8 h-8 text-emerald-400" />
									</div>

									<div>
										<h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
											Conta Criada com Sucesso! 🎉
										</h2>
										<p className="text-gray-400 text-sm">
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
															"Erro ao reenviar email. Tente novamente."
													);
													setSuccessMessage(null);
												} else {
													setError(null);
													setSuccessMessage(
														"✅ Email reenviado com sucesso! Verifique sua caixa de entrada."
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

									<p className="text-xs text-gray-500 pt-2">
										Já confirmou?{" "}
										<button
											onClick={() => setMode("signin")}
											className="text-emerald-400 hover:text-emerald-300 underline">
											Fazer login aqui
										</button>
									</p>
								</div>
							) : (
								<>
									<div className="text-center mb-4 sm:mb-6">
										<h2 className="text-lg sm:text-xl font-bold text-white">
											{mode === "signin" ? "Acessar Central" : "Começar Agora"}
										</h2>
										<p className="text-gray-400 text-[11px] sm:text-xs mt-1">
											{mode === "signin"
												? "Digite suas credenciais de gestor."
												: "Crie sua conta em 30 segundos."}
										</p>
									</div>

									<form
										onSubmit={handleSubmit}
										className="space-y-2.5 sm:space-y-4">
										{mode === "signup" && (
											<div className="space-y-1 sm:space-y-1.5">
												<Label className="text-xs uppercase text-gray-500 font-bold">
													Nome da Arena
												</Label>
												<div className="relative">
													<Trophy className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
													<Input
														value={arenaName}
														onChange={(e) => setArenaName(e.target.value)}
														autoComplete="organization"
														className="pl-10 bg-white/5 border-white/10 text-white h-10 sm:h-11 focus:border-emerald-500/50 focus:ring-emerald-500/20"
														placeholder="Ex: ArenaSys Tatuí"
													/>
												</div>
											</div>
										)}

										<div className="space-y-1 sm:space-y-1.5">
											<Label className="text-xs uppercase text-gray-500 font-bold">
												Email Corporativo
											</Label>
											<div className="relative">
												<ShieldCheck className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
												<Input
													type="email"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													autoComplete="email"
													className="pl-10 bg-white/5 border-white/10 text-white h-10 sm:h-11 focus:border-emerald-500/50 focus:ring-emerald-500/20"
													placeholder="gestor@arenasys.com"
												/>
											</div>
										</div>

										<div className="space-y-1 sm:space-y-1.5">
											<Label className="text-xs uppercase text-gray-500 font-bold">
												Senha de Acesso
											</Label>
											<div className="relative">
												<Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
												<Input
													type="password"
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													autoComplete={
														mode === "signin"
															? "current-password"
															: "new-password"
													}
													className="pl-10 bg-white/5 border-white/10 text-white h-10 sm:h-11 focus:border-emerald-500/50 focus:ring-emerald-500/20"
													placeholder="••••••••"
												/>
											</div>
										</div>

										{error && (
											<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
												{error}
											</div>
										)}

										<Button
											type="submit"
											disabled={isLoading}
											className="w-full h-10 sm:h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm sm:text-base shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
											{isLoading ? (
												"Conectando..."
											) : (
												<span className="flex items-center gap-2">
													{mode === "signin"
														? "Entrar no Sistema"
														: "Liberar Meu Acesso"}
													<ArrowRight className="w-5 h-5" />
												</span>
											)}
										</Button>
									</form>

									<div className="mt-2 sm:mt-4 text-center">
										<button
											onClick={() => {
												setMode(mode === "signin" ? "signup" : "signin");
												setError(null);
												setSuccessMessage(null);
												setSignupEmail("");
											}}
											className="text-sm text-gray-400 hover:text-white transition-colors">
											{mode === "signin"
												? "Não tem conta? Criar acesso grátis"
												: "Já tem conta? Fazer login"}
										</button>
									</div>
								</>
							)}
						</div>

						{/* Selo de Segurança */}
						<div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 text-[9px] sm:text-[10px] text-gray-500 opacity-60">
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
