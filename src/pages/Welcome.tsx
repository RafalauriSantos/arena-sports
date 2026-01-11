import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	CheckCircle2,
	Sparkles,
	Calendar,
	Users,
	ArrowRight,
	Trophy,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Button } from "@/components/ui/button";

// Componente de Confete simples (CSS-only)
function Confetti() {
	const [show, setShow] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setShow(false), 3000);
		return () => clearTimeout(timer);
	}, []);

	if (!show) return null;

	return (
		<div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
			{[...Array(50)].map((_, i) => (
				<div
					key={i}
					className="absolute animate-confetti"
					style={{
						left: `${Math.random() * 100}%`,
						animationDelay: `${Math.random() * 2}s`,
						animationDuration: `${2 + Math.random() * 2}s`,
					}}>
					{["🎉", "✨", "⭐", "🎊"][Math.floor(Math.random() * 4)]}
				</div>
			))}
			<style>{`
				@keyframes confetti {
					0% {
						transform: translateY(0) rotate(0deg);
						opacity: 1;
					}
					100% {
						transform: translateY(100vh) rotate(360deg);
						opacity: 0;
					}
				}
				.animate-confetti {
					animation: confetti linear forwards;
					font-size: 1.5rem;
				}
			`}</style>
		</div>
	);
}

// Checklist items
interface ChecklistItem {
	id: string;
	label: string;
	icon: React.ReactNode;
	completed: boolean;
	onClick?: () => void;
}

export default function Welcome() {
	const navigate = useNavigate();
	const { userProfile, tenantId } = useAuth();
	const { subscription } = useSubscriptionAccess();

	const [loading, setLoading] = useState(true);
	const [businessName, setBusinessName] = useState<string>("");
	const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
	const [trialDays, setTrialDays] = useState<{
		current: number;
		total: number;
	}>({ current: 1, total: 21 });
	const [showConfetti, setShowConfetti] = useState(true);
	const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);
	const timerRef = useRef<number | null>(null);

	// Nome do usuário (fallback para email se não tiver full_name)
	const userName = userProfile?.full_name
		? userProfile.full_name.split(" ")[0]
		: userProfile?.email?.split("@")[0] || "Arena";

	useEffect(() => {
		const run = async () => {
			const { data } = await supabase.auth.getSession();
			if (!data.session) {
				navigate("/login", { replace: true });
				return;
			}

			if (!tenantId) {
				// Se não tem tenant ainda, aguarda um pouco e tenta novamente
				setTimeout(() => {
					if (!tenantId) {
						navigate("/login", { replace: true });
					}
				}, 2000);
				return;
			}

			// Verificar se já completou onboarding - se sim, redireciona para dashboard
			const { data: profile } = await supabase
				.from("profiles")
				.select("onboarding_completed_at")
				.eq("id", data.session.user.id)
				.single();

			if (profile?.onboarding_completed_at) {
				// Já completou onboarding → vai direto pro dashboard
				navigate("/dashboard", { replace: true });
				return;
			}

			// Buscar nome da arena
			const { data: tenant } = await supabase
				.from("tenants")
				.select("business_name")
				.eq("id", tenantId)
				.single();

			if (tenant?.business_name) {
				setBusinessName(tenant.business_name);
			}

			// Calcular dias do trial
			if (subscription?.trial_started_at && subscription?.trial_ends_at) {
				const started = new Date(subscription.trial_started_at);
				const ends = new Date(subscription.trial_ends_at);
				const now = new Date();
				const totalDays = Math.ceil(
					(ends.getTime() - started.getTime()) / (1000 * 60 * 60 * 24)
				);
				const currentDay =
					Math.ceil(
						(now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24)
					) + 1;

				setTrialDays({
					current: Math.max(1, Math.min(currentDay, totalDays)),
					total: totalDays,
				});
			}

			// Verificar progresso do checklist
			const [courtsRes, bookingsRes] = await Promise.all([
				supabase
					.from("courts")
					.select("id")
					.eq("tenant_id", tenantId)
					.eq("active", true)
					.limit(1),
				supabase
					.from("bookings")
					.select("id")
					.eq("tenant_id", tenantId)
					.limit(1),
			]);

			const hasCourts = (courtsRes.data?.length ?? 0) > 0;
			const hasBookings = (bookingsRes.data?.length ?? 0) > 0;

			setChecklist([
				{
					id: "create-arena",
					label: "Criar primeira quadra",
					icon: <Trophy className="w-4 h-4" />,
					completed: hasCourts,
					onClick: () => navigate("/dashboard"),
				},
				{
					id: "define-hours",
					label: "Definir horários e preços",
					icon: <Calendar className="w-4 h-4" />,
					completed: hasBookings || hasCourts, // Se tem quadra, provavelmente definiu horários
					onClick: () => navigate("/dashboard"),
				},
				{
					id: "invite-team",
					label: "Convidar equipe (em breve)",
					icon: <Users className="w-4 h-4" />,
					completed: false,
					onClick: undefined, // Desabilitado por enquanto
				},
			]);

			setLoading(false);

			// Confete aparece só na primeira vez que vê o welcome
			// (não depende de localStorage, já que estamos verificando no banco)
			setShowConfetti(true);
		};

		run();

		return () => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [navigate, tenantId, subscription]);

	if (loading) {
		return (
			<div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center">
				<div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const progressPercentage = (trialDays.current / trialDays.total) * 100;
	const completedCount = checklist.filter((item) => item.completed).length;
	const totalChecklistItems = checklist.filter(
		(item) => item.id !== "invite-team"
	).length; // Não conta "em breve"

	return (
		<div className="min-h-screen w-full flex bg-[#02040a] text-white relative overflow-hidden font-sans selection:bg-emerald-500/30">
			{showConfetti && <Confetti />}

			{/* Background */}
			<div className="absolute inset-0 z-0">
				<div className="absolute inset-0 bg-gradient-to-br from-[#02040a] via-[#03050c] to-[#02040a]" />
				<div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
				<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
				<div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
			</div>

			{/* Conteúdo Principal */}
			<div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center min-h-[100dvh]">
				<div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
					{/* Header com Badge */}
					<div className="text-center space-y-4">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">
							<Sparkles className="w-3 h-3" />
							Conta Criada com Sucesso
						</div>

						<h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1]">
							Bem-vindo ao{" "}
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
								Arena Sports
							</span>
							{userName && `, ${userName}!`}
						</h1>

						<p className="text-gray-400 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
							Sua arena agora tem um sistema profissional de gestão.
						</p>
					</div>

					{/* Card Principal */}
					<div className="relative bg-[#0a0c10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
						{/* Gradiente animado no border */}
						<div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 opacity-50 blur-sm" />

						<div className="relative space-y-6">
							{/* Mensagem de Trial */}
							<div className="text-center space-y-2">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
									<Trophy className="w-3 h-3" />
									21 dias gratuitos
								</div>
								<p className="text-gray-300 text-sm">
									Você tem{" "}
									<strong className="text-white">21 dias gratuitos</strong> para
									testar tudo sem compromisso.
								</p>
							</div>

							{/* Barra de Progresso do Trial */}
							<div className="space-y-2">
								<div className="flex items-center justify-between text-xs text-gray-400">
									<span>
										Dia {trialDays.current} de {trialDays.total} do seu teste
										grátis
									</span>
									<span className="font-bold text-emerald-400">
										{trialDays.total - trialDays.current} dias restantes
									</span>
								</div>
								<div className="h-3 w-full rounded-full bg-white/5 overflow-hidden border border-white/10">
									<div
										className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
										style={{ width: `${progressPercentage}%` }}>
										<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
									</div>
								</div>
								<style>{`
									@keyframes shimmer {
										0% { transform: translateX(-100%); }
										100% { transform: translateX(100%); }
									}
									.animate-shimmer {
										animation: shimmer 2s infinite;
									}
								`}</style>
							</div>

							{/* Divisor */}
							<div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

							{/* Checklist */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
									Checklist de Primeiros Passos
								</h3>
								<div className="space-y-2">
									{checklist.map((item) => (
										<button
											key={item.id}
											onClick={item.onClick}
											disabled={!item.onClick}
											className={`
												w-full flex items-center gap-3 p-3 rounded-lg border transition-all
												${
													item.completed
														? "bg-emerald-500/10 border-emerald-500/30 text-white"
														: item.onClick
														? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white cursor-pointer"
														: "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed opacity-60"
												}
											`}>
											<div
												className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
													item.completed
														? "bg-emerald-500 border-emerald-500"
														: "border-gray-500"
												}`}>
												{item.completed && (
													<CheckCircle2 className="w-3 h-3 text-black" />
												)}
											</div>
											<div className="flex-1 flex items-center gap-2">
												{item.icon}
												<span
													className={`text-sm font-medium ${
														item.completed ? "line-through opacity-70" : ""
													}`}>
													{item.label}
												</span>
											</div>
											{item.onClick && !item.completed && (
												<ArrowRight className="w-4 h-4 text-gray-400" />
											)}
										</button>
									))}
								</div>

								{/* Progresso do Checklist */}
								<div className="pt-2 text-center">
									<p className="text-xs text-gray-500">
										{completedCount} de {totalChecklistItems} tarefas concluídas
									</p>
									<div className="h-1.5 w-full rounded-full bg-white/5 mt-2 overflow-hidden">
										<div
											className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
											style={{
												width: `${
													(completedCount / totalChecklistItems) * 100
												}%`,
											}}
										/>
									</div>
								</div>
							</div>

							{/* CTA Principal */}
							<div className="pt-4">
								<Button
									onClick={async () => {
										setIsCompletingOnboarding(true);
										try {
											// Marcar onboarding como completo no banco
											const {
												data: { user },
											} = await supabase.auth.getUser();
											if (user) {
												await supabase
													.from("profiles")
													.update({
														onboarding_completed_at: new Date().toISOString(),
													})
													.eq("id", user.id);
											}
											// Pequeno delay para feedback visual
											await new Promise((resolve) => setTimeout(resolve, 1000));
											// Ir para dashboard
											navigate("/dashboard");
										} catch (error) {
											console.error("Erro ao completar onboarding:", error);
											setIsCompletingOnboarding(false);
										}
									}}
									disabled={isCompletingOnboarding}
									className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2">
									{isCompletingOnboarding ? (
										<>
											<div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
											Configurando sua arena...
										</>
									) : (
										<>
											Começar Agora
											<ArrowRight className="w-4 h-4" />
										</>
									)}
								</Button>
								<p className="text-center text-xs text-gray-500 mt-3">
									Pequenos extras que marcam muito 💚
								</p>
							</div>
						</div>
					</div>

					{/* Mensagem Final */}
					<div className="text-center">
						<p className="text-gray-500 text-xs">
							Seu trial termina em {trialDays.total - trialDays.current} dias.
							Durante este período, você tem acesso completo a todas as
							funcionalidades.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
