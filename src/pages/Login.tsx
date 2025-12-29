import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const Login = () => {
	const [mode, setMode] = useState<"signin" | "signup">("signup");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [arenaName, setArenaName] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const [remember, setRemember] = useState(false);
	const SAVED_ADMIN_EMAIL_KEY = "arena_saved_admin_email";

	useEffect(() => {
		try {
			const saved = localStorage.getItem(SAVED_ADMIN_EMAIL_KEY);
			if (saved) {
				setEmail(saved);
				setRemember(true);
			}
		} catch (e) {
			// ignore
		}
	}, []);

	// Mágica da Persistência: se já houver sessão ativa no Supabase, não redirecionamos automaticamente.
	// Em vez disso mostramos um banner permitindo que o usuário escolha: ir ao Dashboard ou encerrar a sessão.
	const [checkingSession, setCheckingSession] = useState(true);
	const [existingSessionUser, setExistingSessionUser] = useState<{
		email?: string;
	} | null>(null);

	useEffect(() => {
		let mounted = true;
		const checkSession = async () => {
			try {
				const { data } = await supabase.auth.getSession();
				const session = (data as any)?.session;
				if (session?.user && mounted) {
					setExistingSessionUser({ email: session.user.email });
				}
			} catch (e) {
				// ignore
			} finally {
				if (mounted) setCheckingSession(false);
			}
		};

		checkSession();

		const { data: listener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				if (!mounted) return;
				if (event === "SIGNED_IN" && session?.user) {
					setExistingSessionUser({ email: session.user.email });
				}
				if (event === "SIGNED_OUT") {
					setExistingSessionUser(null);
				}
			}
		);

		return () => {
			mounted = false;
			listener?.subscription?.unsubscribe?.();
		};
	}, [navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		try {
			if (mode === "signin") {
				const { error: signInError } = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				if (signInError) throw signInError;
			} else {
				const { data, error: signUpError } = await supabase.auth.signUp({
					email,
					password,
				});
				if (signUpError) throw signUpError;

				const session =
					data.session ?? (await supabase.auth.getSession()).data.session;
				if (!session) {
					throw new Error(
						"Verifique seu e-mail para confirmar a conta e finalize o cadastro."
					);
				}

				const businessName = arenaName || "Minha Arena";
				const { error: onboardError } = await supabase.rpc("fn_onboard_user", {
					p_business_name: businessName,
					p_saas_slug: "arena-sports",
				});
				if (onboardError) throw onboardError;
			}

			try {
				if (remember) {
					localStorage.setItem(SAVED_ADMIN_EMAIL_KEY, email);
				} else {
					localStorage.removeItem(SAVED_ADMIN_EMAIL_KEY);
				}
			} catch (e) {
				// ignore
			}

			// Force full page navigation so browser can prompt to save credentials
			window.location.assign("/dashboard");
		} catch (err: unknown) {
			const message =
				err && typeof err === "object" && "message" in err
					? (err as { message?: string }).message
					: "Erro ao autenticar";
			setError(message || "Erro ao autenticar");
		} finally {
			setIsLoading(false);
		}
	};
	return (
		<div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground relative overflow-hidden">
			<div
				className="absolute inset-0 pointer-events-none opacity-40"
				aria-hidden>
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,128,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(0,255,128,0.05),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(0,255,128,0.07),transparent_25%)]" />
			</div>

			<div className="relative mx-auto max-w-6xl px-4 py-10 lg:py-14">
				<div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-center">
					<div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/50 text-xs font-semibold backdrop-blur">
							Arena Sports • Painel
						</div>
						<div className="space-y-4">
							<h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight">
								Gerencie sua arena com elegância e performance.
							</h1>
							<p className="text-base lg:text-lg text-muted-foreground max-w-2xl">
								Reservas, cobranças e operações em um fluxo premium, pensado
								para quem exige o padrão big tech.
							</p>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
							<div className="p-3 rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
								<p className="text-foreground font-semibold text-lg">+50</p>
								<p>Arenas ativas</p>
							</div>
							<div className="p-3 rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
								<p className="text-foreground font-semibold text-lg">99.9%</p>
								<p>Uptime</p>
							</div>
							<div className="p-3 rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
								<p className="text-foreground font-semibold text-lg">5 min</p>
								<p>Tempo de setup</p>
							</div>
						</div>
					</div>

					<div className="w-full lg:w-[420px]">
						<div className="bg-card/80 border border-border/70 rounded-3xl shadow-[0_25px_70px_-40px_rgba(0,0,0,0.6)] backdrop-blur-xl p-8 space-y-8">
							<div className="space-y-2 text-center lg:text-left">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 text-xs font-semibold bg-primary/10 text-primary">
									Acesso seguro
								</div>
								<div className="space-y-1">
									<h2 className="text-2xl font-semibold tracking-tight">
										{mode === "signup" ? "Criar conta" : "Entrar"}
									</h2>
									<p className="text-sm text-muted-foreground">
										{mode === "signup"
											? "Configure sua arena em minutos."
											: "Bem-vindo de volta."}
									</p>
								</div>
							</div>

							<form
								className="space-y-5"
								onSubmit={handleSubmit}
								autoComplete="on">
								{/* Se já houver sessão ativa, mostramos um banner com ações para o usuário */}
								{
									/* existing session banner removed per UX request */ false && (
										<div className="p-3 rounded-lg bg-yellow-600/10 border border-yellow-500/20 text-sm text-yellow-300 flex items-center justify-between gap-4">
											<div>
												<p className="font-medium">
													Você já está logado como{" "}
													<span className="font-bold">
														{existingSessionUser.email}
													</span>
													.
												</p>
												<p className="text-xs text-yellow-200/80 mt-1">
													Deseja ir para o painel ou encerrar a sessão?
												</p>
											</div>
											<div className="flex gap-2">
												<button
													type="button"
													onClick={() => window.location.assign("/dashboard")}
													className="rounded-md bg-yellow-500 px-3 py-1 text-yellow-950 font-semibold">
													Ir ao Dashboard
												</button>
												<button
													type="button"
													onClick={async () => {
														await supabase.auth.signOut();
														setExistingSessionUser(null);
													}}
													className="rounded-md border border-yellow-500/40 px-3 py-1 text-yellow-200">
													Encerrar Sessão
												</button>
											</div>
										</div>
									)
								}
								<div className="space-y-2">
									<label htmlFor="email" className="text-sm font-medium">
										Email
									</label>
									<input
										id="email"
										name="email"
										type="email"
										autoFocus
										autoComplete="username"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="voce@arenasports.com"
										required
										className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="password" className="text-sm font-medium">
										Senha
									</label>
									<div className="relative">
										<input
											id="password"
											name="password"
											type={showPassword ? "text" : "password"}
											autoComplete={
												mode === "signup" ? "new-password" : "current-password"
											}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="Digite sua senha"
											required
											className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((v) => !v)}
											className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition"
											aria-label={
												showPassword ? "Ocultar senha" : "Mostrar senha"
											}>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>

								{mode === "signin" && (
									<div className="flex items-center gap-2">
										<input
											id="remember-admin"
											name="remember-admin"
											type="checkbox"
											checked={remember}
											onChange={(e) => setRemember(e.target.checked)}
											className="w-4 h-4 rounded"
										/>
										<label
											htmlFor="remember-admin"
											className="text-sm text-muted-foreground">
											Lembrar meu email
										</label>
									</div>
								)}

								{mode === "signup" && (
									<div className="space-y-2">
										<label htmlFor="arena" className="text-sm font-medium">
											Nome da Arena
										</label>
										<input
											id="arena"
											type="text"
											autoComplete="organization"
											value={arenaName}
											onChange={(e) => setArenaName(e.target.value)}
											placeholder="Minha Arena"
											className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
										/>
									</div>
								)}

								{error && <p className="text-sm text-destructive">{error}</p>}

								<button
									type="submit"
									disabled={isLoading}
									className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 transition transform hover:-translate-y-[1px] hover:shadow-md disabled:opacity-60">
									{isLoading ? (
										<span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
									) : null}
									<span>
										{mode === "signup" ? "Criar minha arena" : "Entrar"}
									</span>
									{!isLoading && <ArrowRight className="h-4 w-4" />}
								</button>
							</form>

							<div className="pt-4 border-t border-border/60 text-sm text-center space-y-3">
								{mode === "signup" ? (
									<>
										<div className="text-muted-foreground">
											Já tem uma conta?
										</div>
										<button
											className="w-full h-11 rounded-2xl border border-border text-foreground hover:bg-muted/50 transition"
											onClick={() => setMode("signin")}>
											Entrar
										</button>
									</>
								) : (
									<>
										<div className="text-muted-foreground">
											Primeira vez por aqui?
										</div>
										<button
											className="w-full h-11 rounded-2xl border border-border text-foreground hover:bg-muted/50 transition"
											onClick={() => setMode("signup")}>
											Criar nova arena
										</button>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
