import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	ArrowRight,
	CheckCircle2,
	Lock,
	Zap,
	Trophy,
	ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [arenaName, setArenaName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	// --- LÓGICA DE SESSÃO MANTIDA ---
	useEffect(() => {
		const checkSession = async () => {
			const { data } = await supabase.auth.getSession();
			if (data?.session) {
				// Se já estiver logado, joga direto pro dashboard (Zero Fricção)
				navigate("/dashboard");
			}
		};
		checkSession();
	}, [navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			if (mode === "signin") {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				if (error) throw error;
			} else {
				const { data, error } = await supabase.auth.signUp({ email, password });
				if (error) throw error;
				if (data.session) {
					await supabase.rpc("fn_onboard_user", {
						p_business_name: arenaName || "Minha Arena",
						p_saas_slug: "arena-sports",
					});
				}
			}
			navigate("/dashboard");
		} catch (err: any) {
			setError(err.message || "Erro de autenticação");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex bg-[#02040a] text-white relative overflow-hidden font-sans selection:bg-emerald-500/30">
			{/* 1. FUNDO IMERSIVO (Imagem de Arena + Overlay) */}
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
						<strong>Arena OS</strong> é o cérebro que automatiza suas reservas,
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
												className="pl-10 bg-white/5 border-white/10 text-white h-10 sm:h-11 focus:border-emerald-500/50 focus:ring-emerald-500/20"
												placeholder="Ex: Arena Tatuí"
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
											className="pl-10 bg-white/5 border-white/10 text-white h-10 sm:h-11 focus:border-emerald-500/50 focus:ring-emerald-500/20"
											placeholder="gestor@arena.com"
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
									onClick={() =>
										setMode(mode === "signin" ? "signup" : "signin")
									}
									className="text-sm text-gray-400 hover:text-white transition-colors">
									{mode === "signin"
										? "Não tem conta? Criar acesso grátis"
										: "Já tem conta? Fazer login"}
								</button>
							</div>
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
