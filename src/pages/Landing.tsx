import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
	TrendingUp,
	Zap,
	Play,
	Menu,
	X,
	ShieldCheck,
	XCircle,
	CheckCircle2,
	AlertTriangle,
	Lock,
	Check,
	ArrowRight,
	Smartphone,
	Wallet,
	HelpCircle,
	MessageCircle,
	Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { SEO } from "@/components/SEO";
import { PremiumFooter } from "@/components/PremiumFooter";

// --- HOOK: ANIMAÇÃO DE CONTAGEM (Count-Up) ---
function useCountUp(
	end: number,
	duration: number = 2000,
	shouldStart: boolean = true,
	decimals: number = 0,
): number {
	const [count, setCount] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const hasStartedRef = useRef(false);

	useEffect(() => {
		if (!shouldStart || hasStartedRef.current) return;
		hasStartedRef.current = true;

		const startValue = 0;

		const animate = (timestamp: number) => {
			if (!startTimeRef.current) startTimeRef.current = timestamp;
			const elapsed = timestamp - startTimeRef.current;
			const progress = Math.min(elapsed / duration, 1);

			// Ease-out-expo
			const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

			const current = startValue + (end - startValue) * easeOutExpo;

			// Se decimals=0, arredonda. Se >0, mantém precisão.
			setCount(decimals === 0 ? Math.round(current) : current);

			if (progress < 1) requestAnimationFrame(animate);
		};

		requestAnimationFrame(animate);
	}, [end, duration, shouldStart, decimals]);

	return count;
}

// --- HOOK: DETECTAR VISIBILIDADE (IntersectionObserver) ---
function useInView(
	options?: IntersectionObserverInit,
): [React.RefObject<HTMLDivElement>, boolean] {
	const ref = useRef<HTMLDivElement>(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsInView(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.2, ...options },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [options]);

	return [ref, isInView];
}

// --- COMPONENTE: NÚMERO ANIMADO ---
function AnimatedValue({
	value,
	prefix = "",
	suffix = "",
	className = "",
	duration = 2000,
	decimals = 0,
}: {
	value: number;
	prefix?: string;
	suffix?: string;
	className?: string;
	duration?: number;
	decimals?: number;
}) {
	const [ref, isInView] = useInView();
	const count = useCountUp(value, duration, isInView, decimals);

	return (
		<span ref={ref} className={`number-display ${className}`}>
			{prefix}
			{count.toLocaleString("pt-BR", {
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals,
			})}
			{suffix}
		</span>
	);
}

// --- DEPOIMENTOS REMOVIDOS ---
// Removidos para manter autenticidade. Adicione depoimentos reais conforme receber feedback dos clientes.

// --- DADOS DO FAQ (QUEBRA DE OBJEÇÕES) ---
const faqList = [
	{
		question: "Tenho apenas uma quadra, o sistema serve para mim?",
		answer:
			"Com certeza. O plano 'Arena Start' foi desenhado para quem está começando ou tem estrutura enxuta. Você profissionaliza sua gesto e comea a receber com mais previsibilidade sem depender do WhatsApp.",
	},
	{
		question: "Preciso instalar algum programa no computador?",
		answer:
			"Não! O ArenaSys é 100% online. Você acessa pelo navegador do celular, tablet ou computador, de qualquer lugar.",
	},
	{
		question: "É difícil de configurar? Não sou bom com tecnologia.",
		answer:
			"Fizemos pensando nisso. O setup leva menos de 5 minutos. É tão simples quanto usar o WhatsApp, mas muito mais organizado.",
	},
	{
		question: "Como funciona o recebimento via PIX?",
		answer:
			"O cliente paga na hora da reserva. O dinheiro cai direto na sua conta, sem intermediários segurando seu valor. Você tem fluxo de caixa imediato.",
	},
	{
		question: "Existe contrato de fidelidade?",
		answer:
			"Nenhum. Você é livre para cancelar quando quiser. Confiamos tanto no nosso produto que não precisamos amarrar você com contratos.",
	},
	{
		question: "E se eu precisar de ajuda?",
		answer:
			"Temos um suporte especializado via WhatsApp. Você fala com gente de verdade que entende do seu negócio, não com robôs.",
	},
];

// --- HOOKS & UTILS ---
function useScrollAnimation() {
	const [visibleElements, setVisibleElements] = useState<Set<string>>(
		new Set(),
	);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setVisibleElements((prev) => new Set(prev).add(entry.target.id));
					}
				});
			},
			{ threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
		);

		const elements = document.querySelectorAll("[data-animate]");
		elements.forEach((el) => observer.observe(el));

		return () => observer.disconnect();
	}, []);

	return visibleElements;
}

// --- MOCKUPS VISUAIS ---
function IPhoneMockup({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative transform hover:scale-[1.02] transition-transform duration-500">
			<div className="relative w-[180px] md:w-[220px] h-[380px] md:h-[460px] bg-[#121212] rounded-[30px] md:rounded-[45px] p-[8px] md:p-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#333] ring-1 ring-white/10">
				<div className="absolute top-[10px] md:top-[15px] left-1/2 -translate-x-1/2 w-[60px] md:w-[80px] h-[18px] md:h-[24px] bg-black rounded-full z-20" />
				<div className="relative w-full h-full bg-black rounded-[24px] md:rounded-[36px] overflow-hidden border border-white/5">
					<div className="absolute top-0 inset-x-0 h-8 flex justify-between px-4 pt-2 text-[8px] font-medium text-white z-10">
						<span>9:41</span>
						<div className="flex gap-1">
							<div className="w-3 h-1.5 bg-white rounded-sm" />
						</div>
					</div>
					<div className="pt-8 h-full">{children}</div>
				</div>
			</div>
		</div>
	);
}

function MacBookMockup({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative transform hover:scale-[1.01] transition-transform duration-500">
			<div className="relative w-[280px] md:w-[580px] bg-[#121212] rounded-t-xl p-1.5 border border-[#333] shadow-2xl">
				<div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0a0a0a] rounded-full" />
				<div className="w-full h-[160px] md:h-[360px] bg-black rounded-lg overflow-hidden border border-white/5 relative group">
					{children}
					<div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none group-hover:opacity-50 transition-opacity duration-700" />
				</div>
			</div>
			<div className="relative w-[320px] md:w-[660px] h-[8px] md:h-[12px] bg-[#1a1a1a] rounded-b-lg -ml-[20px] md:-ml-[40px] border-b border-l border-r border-[#333] flex justify-center">
				<div className="w-16 md:w-24 h-1 bg-[#0f0f0f] rounded-b opacity-50" />
			</div>
		</div>
	);
}

// --- TELAS FAKE ---
function CalendarAppScreen() {
	return (
		<div className="h-full bg-[#050507] p-3 font-sans flex flex-col">
			<div className="flex justify-between items-center mb-3">
				<div>
					<h3 className="text-white font-bold text-xs">ArenaSys Central</h3>
					<p className="text-emerald-500 text-[9px] font-medium flex items-center gap-1">
						<span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />{" "}
						Online
					</p>
				</div>
				<div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-[10px]">
					⚽
				</div>
			</div>
			<div className="flex gap-1.5 overflow-x-auto pb-2 hide-scrollbar">
				{[14, 15, 16, 17].map((d, i) => (
					<div
						key={d}
						className={`min-w-[30px] h-[45px] rounded-lg flex flex-col items-center justify-center transition-all ${
							i === 2 ?
								"bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
							:	"bg-white/5 text-white"
						}`}>
						<span className="text-[7px] opacity-70">SEG</span>
						<span className="font-bold text-xs">{d}</span>
					</div>
				))}
			</div>
			<div className="space-y-2 flex-1 overflow-hidden relative mt-1">
				<div className="p-2 rounded-lg flex justify-between items-center bg-white/5 border border-white/5">
					<div>
						<span className="text-white font-bold block text-xs">18:00</span>
						<span className="text-emerald-400 text-[8px]">Livre</span>
					</div>
					<div className="px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-bold rounded">
						Reservar
					</div>
				</div>
				<div className="p-2 rounded-lg flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 opacity-60">
					<div>
						<span className="text-white font-bold block text-xs">19:00</span>
						<span className="text-white/40 text-[8px]">Ocupado</span>
					</div>
				</div>
				<div className="p-2 rounded-lg flex justify-between items-center bg-white/5 border border-white/5">
					<div>
						<span className="text-white font-bold block text-xs">20:00</span>
						<span className="text-emerald-400 text-[8px]">Livre</span>
					</div>
					<div className="px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-bold rounded">
						Reservar
					</div>
				</div>
			</div>
		</div>
	);
}

function DashboardAppScreen() {
	return (
		<div className="h-full bg-[#02040a] p-4 font-sans relative overflow-hidden">
			<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
			<div className="flex justify-between items-center mb-4 relative z-10">
				<div className="flex gap-2 items-center">
					<div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center text-black font-bold text-[10px]">
						A
					</div>
					<h3 className="text-white font-bold text-xs">Faturamento</h3>
				</div>
				<div className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
					+27% este mês
				</div>
			</div>
			<div className="grid grid-cols-3 gap-3 mb-4 relative z-10">
				<div className="bg-white/5 p-2 rounded-lg border border-white/10">
					<p className="text-gray-400 text-[7px] uppercase font-bold tracking-wider">
						Hoje
					</p>
					<p className="text-white text-sm font-bold mt-0.5">R$ 1.850</p>
				</div>
				<div className="bg-white/5 p-2 rounded-lg border border-white/10">
					<p className="text-gray-400 text-[7px] uppercase font-bold tracking-wider">
						Pix
					</p>
					<p className="text-emerald-400 text-sm font-bold mt-0.5">R$ 8.2k</p>
				</div>
				<div className="bg-white/5 p-2 rounded-lg border border-white/10">
					<p className="text-gray-400 text-[7px] uppercase font-bold tracking-wider">
						Projeção
					</p>
					<p className="text-white text-sm font-bold mt-0.5">R$ 42k</p>
				</div>
			</div>
			<div className="bg-white/5 rounded-lg border border-white/10 h-28 relative overflow-hidden flex items-end p-2 gap-1.5 z-10">
				{[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
					<div
						key={i}
						className="flex-1 bg-gradient-to-t from-emerald-500/20 to-emerald-500/60 rounded-t-[2px]"
						style={{ height: `${h}%` }}
					/>
				))}
			</div>
		</div>
	);
}

// --- PÁGINA PRINCIPAL ---

export default function LandingPage() {
	const navigate = useNavigate();
	const visibleElements = useScrollAnimation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [foundersProgress, setFoundersProgress] = useState<{
		cap: number;
		sold: number;
		remaining: number;
	} | null>(null);
	const showBrandTextMobile = !scrolled || mobileMenuOpen;

	const isVisible = (id: string) => visibleElements.has(id);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		let mounted = true;
		(async () => {
			const { data, error } = await supabase.rpc("get_founders_progress");
			if (!mounted) return;
			if (error || !data) {
				setFoundersProgress(null);
				return;
			}
			const row = Array.isArray(data) ? data[0] : data;
			const cap = Number(row?.cap ?? 100);
			const sold = Number(row?.sold ?? 0);
			const remaining = Number(row?.remaining ?? Math.max(0, cap - sold));
			setFoundersProgress({ cap, sold, remaining });
		})();
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<>
			<SEO
				title="ArenaSys - Sistema de Gestão e Agendamento de Quadras Esportivas"
				description="Transforme sua quadra em uma máquina de faturamento. Sistema completo para gestão de reservas, pagamentos via PIX e agenda online. 7 dias grátis para testar."
				keywords="sistema gestão quadras, agendamento quadras esportivas, software arena, gestão reservas esportivas, sistema agendamento online, software para quadras, gestão de quadra society, sistema booking esportivo, SaaS quadras, agendamento automático quadras"
				canonical="/"
			/>
			<div className="min-h-screen bg-[#02040a] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden scroll-smooth">
				{/* Estilos para Animação Marquee */}
				<style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

				{/* Background Global */}
				<div className="fixed inset-0 z-0 pointer-events-none">
					<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
					<div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px]" />
				</div>

				{/* NAVBAR FLUTUANTE */}
				<header
					className={cn(
						"fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ease-in-out px-4",
						scrolled ? "pt-4" : "pt-6",
					)}>
					<nav
						className={cn(
							"relative flex items-center justify-between transition-all duration-500 ease-out border backdrop-blur-2xl",
							scrolled ?
								"w-full max-w-4xl h-12 rounded-full bg-[#0a0a0a]/80 border-white/10 shadow-lg px-6"
							:	"w-full max-w-6xl h-16 bg-transparent border-transparent px-2",
						)}>
						<div
							className="flex items-center gap-2 cursor-pointer group"
							onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
							<div
								className={cn(
									"flex items-center justify-center transition-all duration-300",
									scrolled ?
										"w-7 h-7 rounded-full bg-emerald-500/10"
									:	"w-8 h-8 rounded-xl bg-emerald-500/10",
								)}>
								<Zap
									className={cn(
										"transition-all duration-300 text-emerald-500",
										scrolled ? "w-3 h-3" : "w-4 h-4",
									)}
								/>
							</div>
							<span
								className={cn(
									"font-bold tracking-tight text-white transition-all",
									scrolled ? "text-sm" : "text-base",
									"hidden md:inline",
								)}>
								ArenaSys
							</span>
							<span
								className={cn(
									"md:hidden font-bold tracking-tight text-white",
									"overflow-hidden whitespace-nowrap",
									"transition-[max-width,opacity,transform] duration-300 ease-out",
									showBrandTextMobile ?
										"max-w-[140px] opacity-100 translate-x-0"
									:	"max-w-0 opacity-0 -translate-x-2",
								)}>
								ArenaSys
							</span>
						</div>

						<div className="hidden md:flex items-center gap-1">
							{[
								{ name: "Comparativo", href: "#comparison" },
								{ name: "Passo a Passo", href: "#steps" },
								{ name: "Planos", href: "#pricing" },
								{ name: "FAQ", href: "#faq" },
							].map((item) => (
								<a
									key={item.name}
									href={item.href}
									className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
									{item.name}
								</a>
							))}
						</div>

						<div className="hidden md:flex items-center gap-2">
							<button
								onClick={() => navigate("/login")}
								className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-2">
								Login
							</button>
							<Button
								onClick={() => navigate("/login?mode=signup")}
								className={cn(
									"rounded-full font-bold transition-all shadow-lg shadow-emerald-500/10",
									scrolled ?
										"h-8 px-4 text-xs bg-white text-black hover:bg-gray-200"
									:	"h-9 px-5 text-sm bg-emerald-500 text-black hover:bg-emerald-400",
								)}>
								Criar Conta
							</Button>
						</div>

						<button
							className="md:hidden p-2 text-gray-400 hover:text-white"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
							{mobileMenuOpen ?
								<X size={18} />
							:	<Menu size={18} />}
						</button>

						{mobileMenuOpen && (
							<div className="absolute top-full left-0 right-0 mt-2 p-4 bg-[#0F1115] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 md:hidden">
								{[
									{ name: "Comparativo", href: "#comparison" },
									{ name: "Passo a Passo", href: "#steps" },
									{ name: "Planos", href: "#pricing" },
									{ name: "FAQ", href: "#faq" },
								].map((item) => (
									<a
										key={item.name}
										href={item.href}
										onClick={() => setMobileMenuOpen(false)}
										className="p-3 hover:bg-white/5 rounded-xl text-gray-300 text-sm">
										{item.name}
									</a>
								))}
								<div className="h-px bg-white/10 my-2" />
								<button
									onClick={() => {
										setMobileMenuOpen(false);
										navigate("/login");
									}}
									className="p-3 hover:bg-white/5 rounded-xl text-gray-300 text-sm text-left">
									Login
								</button>
								<Button
									onClick={() => {
										setMobileMenuOpen(false);
										navigate("/login?mode=signup");
									}}
									className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-10 text-sm mt-1">
									Criar Conta
								</Button>
							</div>
						)}
					</nav>
				</header>

				{/* --- HERO SECTION --- */}
				<section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 px-4 overflow-hidden flex flex-col items-center">
					<div className="relative z-10 max-w-3xl mx-auto text-center space-y-6 mb-12">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-4 duration-1000">
							<span className="relative flex h-1.5 w-1.5">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
							</span>
							Usado por arenas que faturam mais
						</div>

						<h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
							Pare de perder dinheiro <br />
							<span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-600">
								respondendo WhatsApp.
							</span>
						</h1>

						<p className="text-base md:text-lg text-gray-400 max-w-lg mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
							Seu cliente reserva e paga online. Você só aprova e conta o
							dinheiro.
							<span className="text-white font-medium">
								{" "}
								Acabou o calote. Acabou o caos.
							</span>
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
							<Button
								onClick={() => navigate("/login")}
								className="h-11 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 w-full sm:w-auto glow-pulse-delayed btn-press-premium">
								Começar Grátis por 7 Dias
							</Button>
							<a
								href="#pricing"
								className="flex items-center gap-2 text-gray-400 hover:text-white transition font-medium px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 text-xs">
								Ver Planos e Preços
							</a>
						</div>
					</div>

					{/* MOCKUPS */}
					<div className="relative w-full max-w-4xl mx-auto perspective-1000 group">
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[40%] bg-emerald-500/10 rounded-full blur-[80px] group-hover:bg-emerald-500/20 transition duration-1000" />
						<div className="relative flex flex-col items-center md:flex-row md:items-end md:justify-center transform transition-transform duration-700 hover:scale-[1.01]">
							<div className="relative z-10 shadow-2xl">
								<MacBookMockup>
									<DashboardAppScreen />
								</MacBookMockup>
							</div>
							<div className="relative z-20 transform scale-[0.7] md:scale-[0.8] animate-float shadow-2xl mt-[-36px] sm:mt-[-44px] md:mt-0 md:ml-[-56px] lg:ml-[-72px] md:mb-6">
								<IPhoneMockup>
									<CalendarAppScreen />
								</IPhoneMockup>
							</div>
						</div>
					</div>
				</section>

				{/* --- SEÇÃO DE PROVA SOCIAL (JUNTE-SE AOS PRIMEIROS) --- */}
				{/* --- SEÇÃO: PROGRAMA FOUNDERS (URGÊNCIA + ESCASSEZ) --- */}
				<section className="py-20 px-6 border-y border-white/5 bg-gradient-to-b from-[#050507] via-emerald-500/5 to-[#050507] relative overflow-hidden">
					{/* Background Effects */}
					<div className="absolute inset-0 opacity-30">
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
					</div>

					<div className="max-w-5xl mx-auto relative z-10">
						{/* Badge de Urgência */}
						<div className="flex justify-center mb-6">
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-full badge-urgent-glow relative overflow-hidden">
								{/* Shimmer overlay */}
								<div className="absolute inset-0 shimmer-continuous" />
								<div className="w-2 h-2 bg-red-500 rounded-full animate-ping relative z-10" />
								<p className="text-[10px] text-red-400 font-black tracking-widest uppercase relative z-10">
									⚡ Oferta Limitada - Apenas 20 Vagas
								</p>
							</div>
						</div>

						{/* Headline Principal */}
						<div className="text-center mb-8">
							<h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white via-emerald-300 to-white bg-clip-text text-transparent leading-tight">
								Economize R$ 349 por ano
								<br />
								<span className="text-emerald-400">para sempre</span>
							</h2>
							<p className="text-xl md:text-2xl text-gray-300 font-bold mb-2">
								30% de desconto permanente
							</p>
							<p className="text-gray-400 text-base max-w-2xl mx-auto">
								Os primeiros 20 arenas que se juntarem agora ganham{" "}
								<strong className="text-white">desconto vitalício</strong>. Não
								é promoção temporária — é seu preço para sempre.
							</p>
						</div>

						{/* Card de Escassez e Urgência */}
						{foundersProgress && foundersProgress.remaining > 0 && (
							<div className="max-w-2xl mx-auto">
								<div className="relative p-8 bg-gradient-to-br from-[#0F1115] to-[#050507] border-2 border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden">
									{/* Glow Effect */}
									<div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-50" />

									<div className="relative z-10">
										{/* Contador de Vagas */}
										<div className="text-center mb-6">
											<p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-bold mb-3">
												Vagas Restantes
											</p>
											<div className="flex items-baseline justify-center gap-3 mb-4">
												<span className="text-6xl md:text-7xl font-black text-emerald-400 leading-none">
													{foundersProgress.remaining}
												</span>
												<span className="text-2xl text-gray-500">
													/ {foundersProgress.cap}
												</span>
											</div>

											{/* Barra de Progresso */}
											<div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-4 border border-white/10">
												<div
													className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out relative"
													style={{
														width: `${((foundersProgress.cap - foundersProgress.remaining) / foundersProgress.cap) * 100}%`,
													}}>
													<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
												</div>
											</div>

											<p className="text-sm text-gray-400">
												{foundersProgress.cap - foundersProgress.remaining}{" "}
												arenas já garantiram o desconto
											</p>
										</div>

										{/* Comparação de Preços */}
										<div className="grid md:grid-cols-2 gap-4 mb-6">
											{/* Preço Normal */}
											<div className="p-4 bg-white/5 rounded-xl border border-white/10">
												<p className="text-xs uppercase text-gray-500 mb-2 font-bold">
													Preço Normal
												</p>
												<div className="flex items-baseline gap-1">
													<span className="text-2xl font-black text-gray-400 line-through">
														R$ 97
													</span>
													<span className="text-sm text-gray-500">/mês</span>
												</div>
												<p className="text-xs text-gray-600 mt-1">
													R$ 970/ano (2 meses grátis)
												</p>
											</div>

											{/* Preço Founder */}
											<div className="p-4 bg-emerald-500/10 rounded-xl border-2 border-emerald-500/40 relative overflow-hidden">
												<div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-bl-lg">
													FOUNDER
												</div>
												<p className="text-xs uppercase text-emerald-400 mb-2 font-bold">
													Seu Preço Agora
												</p>
												<div className="flex items-baseline gap-1">
													<span className="text-3xl font-black text-emerald-400">
														R$ 67,90
													</span>
													<span className="text-sm text-emerald-300">/mês</span>
												</div>
												<p className="text-xs text-emerald-300 mt-1 font-bold">
													R$ 679/ano (30% off permanente)
												</p>
											</div>
										</div>

										{/* Economia Destaque */}
										<div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-6">
											<p className="text-xs uppercase text-gray-400 mb-1">
												Você Economiza
											</p>
											<p className="text-3xl font-black text-emerald-400">
												R$ 349,20/ano
											</p>
											<p className="text-xs text-gray-500 mt-1">
												Todos os anos, para sempre
											</p>
										</div>

										{/* Benefícios Exclusivos */}
										<div className="space-y-3 mb-6">
											<div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
												<Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
												<div className="text-left">
													<p className="text-sm font-bold text-white">
														Acesso Prioritário
													</p>
													<p className="text-xs text-gray-400">
														Teste novas funcionalidades antes de todo mundo
													</p>
												</div>
											</div>
											<div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
												<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
												<div className="text-left">
													<p className="text-sm font-bold text-white">
														Suporte Dedicado
													</p>
													<p className="text-xs text-gray-400">
														Atendimento prioritário via WhatsApp
													</p>
												</div>
											</div>
											<div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
												<TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
												<div className="text-left">
													<p className="text-sm font-bold text-white">
														Desconto Permanente
													</p>
													<p className="text-xs text-gray-400">
														Nunca aumenta, mesmo quando subirmos o preço
													</p>
												</div>
											</div>
										</div>

										{/* CTA Principal */}
										<Button
											onClick={() => navigate("/login?mode=signup")}
											className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-base md:text-lg rounded-xl shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
											Garantir Minha Vaga Agora
											<ArrowRight className="w-5 h-5 ml-2" />
										</Button>

										<p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-2">
											<Lock className="w-3 h-3" />
											Sem compromisso • Cancele quando quiser
										</p>
									</div>
								</div>
							</div>
						)}

						{/* Mensagem quando esgotar */}
						{foundersProgress && foundersProgress.remaining === 0 && (
							<div className="max-w-2xl mx-auto p-8 bg-white/5 border border-white/10 rounded-2xl text-center">
								<AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
								<h3 className="text-2xl font-bold text-white mb-2">
									Vagas Esgotadas
								</h3>
								<p className="text-gray-400">
									As 20 vagas do programa Founders foram preenchidas. Você ainda
									pode assinar pelo preço normal de R$ 97/mês.
								</p>
							</div>
						)}
					</div>
				</section>

				{/* --- SEÇÃO TRANSFORMAÇÃO --- */}
				<section className="py-16 bg-[#03050c]">
					<div className="max-w-5xl mx-auto px-6">
						<div className="text-center mb-10">
							<h2 className="text-2xl md:text-3xl font-black text-white">
								Não é mágica. É infraestrutura.
							</h2>
							<p className="text-gray-400 text-sm mt-2">
								A diferença entre uma quadra e uma empresa.
							</p>
						</div>
						<div className="grid md:grid-cols-2 gap-4 relative">
							<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-[#02040a] p-2 rounded-full border border-white/10 hidden md:block">
								<ArrowRight className="text-gray-500 w-5 h-5" />
							</div>
							{/* ANTES */}
							<div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex flex-col gap-4">
								<div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wider">
									<XCircle className="w-4 h-4" /> Antes do ArenaSys
								</div>
								<div className="space-y-3">
									<div className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
										<span className="text-gray-400 text-sm">
											Ocupação Média
										</span>
										<span className="text-red-400 font-mono font-bold">
											~<AnimatedValue value={45} suffix="%" duration={1500} />
										</span>
									</div>
									<div className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
										<span className="text-gray-400 text-sm">
											Prejuízo Mensal (Vagos)
										</span>
										<span className="text-red-400 font-mono font-bold">
											- R$ <AnimatedValue value={4800} duration={1500} />
										</span>
									</div>
									<div className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
										<span className="text-gray-400 text-sm">
											Tempo no WhatsApp
										</span>
										<span className="text-red-400 font-mono font-bold">
											<AnimatedValue value={4} suffix="h" duration={1000} /> /
											dia
										</span>
									</div>
								</div>
							</div>
							{/* DEPOIS */}
							<div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-4 ring-1 ring-emerald-500/10">
								<div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
									<CheckCircle2 className="w-4 h-4" /> Com ArenaSys
								</div>
								<div className="space-y-3">
									<div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
										<span className="text-white text-sm">Ocupação Média</span>
										<span className="text-emerald-400 font-mono font-bold">
											+<AnimatedValue value={72} suffix="%" duration={2000} />{" "}
											🚀
										</span>
									</div>
									<div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
										<span className="text-white text-sm">
											Receita Recuperada
										</span>
										<span className="text-emerald-400 font-mono font-bold">
											+ R$ <AnimatedValue value={6400} duration={2000} />
										</span>
									</div>
									<div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
										<span className="text-white text-sm">Tempo de Gestão</span>
										<span className="text-emerald-400 font-mono font-bold">
											<AnimatedValue value={15} suffix=" min" duration={2000} />{" "}
											/ dia
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* --- SEÇÃO "POR QUE NÃO WHATSAPP?" --- */}
				<section
					id="comparison"
					data-animate
					className={`py-20 px-6 transition-all duration-1000 ease-out ${isVisible("comparison") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}`}>
					<div className="max-w-4xl mx-auto">
						<div className="text-center mb-12">
							<h2 className="text-2xl md:text-4xl font-black text-white">
								WhatsApp não foi feito para vender horários.
							</h2>
							<p className="text-gray-400 text-sm mt-2">
								A ferramenta que você ama está matando seu crescimento.
							</p>
						</div>
						<div className="border border-white/10 rounded-2xl overflow-hidden">
							<div className="grid grid-cols-3 bg-white/5 p-4 text-xs font-bold uppercase tracking-wider text-gray-500">
								<div>Critério</div>
								<div className="text-center">WhatsApp</div>
								<div className="text-center text-emerald-400">ArenaSys</div>
							</div>
							{[
								{
									crit: "Tempo de Resposta",
									bad: "Até 2 horas",
									good: "Imediato (Automático)",
								},
								{
									crit: "Pagamento",
									bad: "Manual / Fiado",
									good: "Pix Antecipado",
								},
								{
									crit: "No-Show (Calote)",
									bad: "Alto Risco",
									good: "Zero Risco",
								},
								{
									crit: "Madrugada/Fim de Semana",
									bad: "Você não atende",
									good: "Vende 24h",
								},
							].map((row, i) => (
								<div
									key={i}
									className="grid grid-cols-3 p-4 border-t border-white/5 items-center hover:bg-white/[0.02]">
									<div className="text-sm font-medium text-white">
										{row.crit}
									</div>
									<div className="text-center text-red-400 text-xs">
										{row.bad}
									</div>
									<div className="text-center text-emerald-400 text-xs font-bold bg-emerald-500/10 py-1 rounded-full">
										{row.good}
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* --- SEÇÃO: COMO FUNCIONA (90 Segundos) --- */}
				<section
					id="steps"
					className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
					<div className="max-w-5xl mx-auto text-center">
						<p className="text-emerald-500 font-bold tracking-widest uppercase text-[10px] mb-4">
							Simples Demais
						</p>
						<h2 className="text-3xl md:text-4xl font-black text-white mb-12">
							Sua arena online em 90 segundos.
						</h2>
						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									step: "1",
									title: "Crie sua Arena",
									text: "Defina suas quadras, horários e preço. O sistema cria sua agenda automaticamente.",
								},
								{
									step: "2",
									title: "Envie o Link",

									text: "Compartilhe seu link exclusivo no WhatsApp e Instagram. É o seu site oficial.",
								},
								{
									step: "3",
									title: "Receba o Pix",
									text: "O cliente reserva e paga. Você recebe a notificação com o dinheiro já garantido.",
								},
							].map((item, i) => (
								<div
									key={i}
									className="relative p-6 bg-[#0F1115] rounded-2xl border border-white/10 group hover:border-emerald-500/30 transition-colors">
									<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl group-hover:bg-emerald-500 group-hover:text-black transition-colors">
										{item.step}
									</div>
									<h3 className="text-white font-bold mb-2">{item.title}</h3>
									<p className="text-gray-400 text-xs">{item.text}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* --- SEÇÃO DE IDENTIFICAÇÃO COM A DOR --- */}
				<section className="py-16 px-6 bg-gradient-to-b from-[#050507] to-[#02040a]">
					<div className="max-w-3xl mx-auto text-center">
						<h2 className="text-2xl md:text-3xl font-black text-white mb-6">
							Se você se identifica com isso, <br />
							<span className="text-emerald-400">ArenaSys é para você:</span>
						</h2>
						<div className="grid md:grid-cols-2 gap-4 text-left">
							<div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
								<div className="flex items-start gap-3">
									<XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
									<p className="text-gray-300 text-sm">
										Passa o dia todo no WhatsApp respondendo{" "}
										<strong className="text-white">
											"tem horário tal dia?"
										</strong>
									</p>
								</div>
							</div>
							<div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
								<div className="flex items-start gap-3">
									<XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
									<p className="text-gray-300 text-sm">
										Já <strong className="text-white">perdeu reserva</strong>{" "}
										porque demorou para responder
									</p>
								</div>
							</div>
							<div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
								<div className="flex items-start gap-3">
									<XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
									<p className="text-gray-300 text-sm">
										Cliente marcou e{" "}
										<strong className="text-white">não apareceu</strong>{" "}
										(calote)
									</p>
								</div>
							</div>
							<div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
								<div className="flex items-start gap-3">
									<XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
									<p className="text-gray-300 text-sm">
										Não sabe{" "}
										<strong className="text-white">quanto faturou</strong> no
										mês passado
									</p>
								</div>
							</div>
							<div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl md:col-span-2">
								<div className="flex items-start gap-3">
									<XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
									<p className="text-gray-300 text-sm">
										Não consegue{" "}
										<strong className="text-white">tirar férias</strong> porque
										precisa estar sempre disponível para responder
									</p>
								</div>
							</div>
						</div>
						<p className="text-gray-400 text-sm mt-8">
							Se marcou 3 ou mais, você está{" "}
							<span className="text-emerald-400 font-bold">
								perdendo dinheiro
							</span>{" "}
							todos os dias.
						</p>
					</div>
				</section>

				{/* --- PRICING --- */}
				<section
					id="pricing"
					data-animate
					className={`py-20 px-6 bg-white/[0.01] border-t border-white/5 transition-all duration-1000 ease-out ${isVisible("pricing") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}`}>
					<div className="max-w-5xl mx-auto">
						<div className="text-center mb-12">
							<h2 className="text-2xl md:text-4xl font-black text-white mb-3">
								Menos que 1 hora de aluguel.
							</h2>
							<p className="text-gray-400 text-sm max-w-lg mx-auto">
								Se o sistema evitar{" "}
								<span className="text-white font-bold">1 calote por mês</span>,
								já se pagou.
							</p>
						</div>
						<div className="max-w-2xl mx-auto">
							{/* PLANO ÚNICO */}
							<div className="relative group rounded-2xl p-[1px] overflow-hidden transform hover:scale-[1.01] transition-all">
								<div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#10b981_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative h-full bg-[#0F1115] rounded-2xl p-6 md:p-8 border border-white/10 group-hover:border-transparent transition-colors">
									<div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-bold px-3 py-1 rounded-bl-lg">
										PLANO COMPLETO
									</div>
									<h3 className="text-lg font-bold text-white mb-1">
										ArenaSys
									</h3>
									<p className="text-gray-400 text-xs mb-5">
										Cliente reserva sozinho. Você só aprova.
									</p>

									{/* Preço Normal */}
									<div className="mb-4">
										<div className="flex items-baseline gap-1 mb-1">
											<span className="text-4xl font-black text-white">
												R$ <AnimatedValue value={97} duration={1000} />
											</span>
											<span className="text-gray-500 text-xs">/mês</span>
										</div>
										<p className="text-[10px] text-gray-500">
											ou R$ <AnimatedValue value={970} duration={1500} />
											/ano (2 meses grátis)
										</p>
									</div>

									{/* Preço Founders (se houver vagas) */}
									{foundersProgress && foundersProgress.remaining > 0 && (
										<div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
											<div className="flex items-center gap-2 mb-2">
												<span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
													Founders 20 - 30% OFF Permanente
												</span>
												<span className="text-[10px] text-gray-400">
													({foundersProgress.remaining} vagas restantes)
												</span>
											</div>
											<div className="flex items-baseline gap-1 mb-1">
												<span className="text-2xl font-black text-emerald-400">
													R${" "}
													<AnimatedValue
														value={67.9}
														decimals={2}
														duration={1500}
													/>
												</span>
												<span className="text-gray-500 text-xs">/mês</span>
											</div>
											<p className="text-[10px] text-gray-400">
												ou R$ <AnimatedValue value={679} duration={1500} />
												/ano (desconto para sempre!)
											</p>
										</div>
									)}

									<ul className="space-y-3 mb-8 text-xs md:text-sm">
										<li className="flex items-center gap-2 text-white">
											<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
											<span>
												Nunca mais <strong>esqueça de responder</strong> uma
												reserva
											</span>
										</li>
										<li className="flex items-center gap-2 text-white">
											<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
											<span>
												Cliente <strong>reserva e paga sozinho</strong> (sem
												você mexer um dedo)
											</span>
										</li>
										<li className="flex items-center gap-2 text-white">
											<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
											<span>
												<strong>Acabou o calote</strong> — recebe antes do jogo
												via Pix
											</span>
										</li>
										<li className="flex items-center gap-2 text-white">
											<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
											<span>
												Gerencie <strong>todas as quadras</strong> num lugar só
											</span>
										</li>
										<li className="flex items-center gap-2 text-white">
											<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
											<span>
												<strong>Mensalistas organizados</strong> — fidelidade e
												receita previsível
											</span>
										</li>
										<li className="flex items-center gap-2 text-white">
											<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
											<span>
												Saiba <strong>quanto faturou</strong> sem abrir planilha
											</span>
										</li>
									</ul>
									<Button
										onClick={() => navigate("/login")}
										className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
										Começar Grátis por 7 Dias
									</Button>
									{foundersProgress && (
										<div className="mt-3 space-y-2">
											<div className="flex items-center justify-between text-[10px] text-gray-500">
												<span>Founders 20</span>
												<span>
													{Math.max(0, foundersProgress.remaining)} de{" "}
													{foundersProgress.cap} vagas restantes
												</span>
											</div>
											<div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
												<div
													className="h-full bg-emerald-500"
													style={{
														width: `${Math.min(
															100,
															(foundersProgress.sold / foundersProgress.cap) *
																100,
														)}%`,
													}}
												/>
											</div>
										</div>
									)}
									<p className="text-center text-[10px] text-gray-500 mt-3 flex justify-center gap-2 items-center">
										<ShieldCheck className="w-3 h-3" /> 7 dias de garantia.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* --- NOVA SEÇÃO DE FAQ (PERGUNTAS FREQUENTES) --- */}
				<section
					id="faq"
					data-animate
					className={`py-20 px-6 transition-all duration-1000 ease-out ${isVisible("faq") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}`}>
					<div className="max-w-4xl mx-auto">
						<div className="text-center mb-12">
							<h2 className="text-2xl md:text-3xl font-black text-white">
								Dúvidas Frequentes
							</h2>
							<p className="text-gray-400 text-sm mt-2">
								Tudo o que você precisa saber para começar sem medo.
							</p>
						</div>

						<div className="grid md:grid-cols-2 gap-6">
							{faqList.map((item, i) => (
								<div
									key={i}
									className="p-6 bg-[#0F1115] border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
									<div className="flex gap-3 mb-3">
										<div className="mt-1">
											<HelpCircle className="w-5 h-5 text-emerald-500" />
										</div>
										<h3 className="text-white font-bold text-sm">
											{item.question}
										</h3>
									</div>
									<p className="text-gray-400 text-xs leading-relaxed pl-8">
										{item.answer}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* --- ECOSYSTEM TEASER --- */}
				<section className="py-20 px-6 text-center border-t border-white/5 bg-[#02040a]">
					<p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-4">
						O que vem por aí
					</p>
					<h2 className="text-2xl font-bold text-white mb-8">
						Construindo o ecossistema do esporte
					</h2>
					<div className="flex flex-wrap justify-center gap-4">
						<div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400 flex items-center gap-2">
							<Smartphone className="w-3 h-3" /> App Mobile (Em breve)
						</div>
						<div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400 flex items-center gap-2">
							<TrendingUp className="w-3 h-3" /> Torneios (Em breve)
						</div>
						<div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400 flex items-center gap-2">
							<Wallet className="w-3 h-3" /> Conta Digital (Em breve)
						</div>
					</div>
				</section>

				{/* --- CTA FINAL --- */}
				<section className="py-20 px-6">
					<div className="max-w-3xl mx-auto relative group">
						<div className="absolute -inset-[2px] rounded-[2.5rem] overflow-hidden">
							<div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#10b981_100%)] opacity-100" />
						</div>
						<div className="relative bg-[#050507] rounded-[2.3rem] p-10 md:p-16 text-center overflow-hidden">
							<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
							<h2 className="text-3xl md:text-5xl font-black text-white mb-6 relative z-10 leading-tight">
								Pare de deixar <br />{" "}
								<span className="text-emerald-400">dinheiro na mesa.</span>
							</h2>
							<div className="flex justify-center relative z-10">
								<Button
									onClick={() => navigate("/login")}
									className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base sm:text-lg shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-transform sm:hover:scale-105 active:scale-95 flex items-center justify-center gap-2 whitespace-normal text-center">
									Começar Grátis por 7 Dias <ArrowRight className="w-5 h-5" />
								</Button>
							</div>
						</div>
					</div>
				</section>

				<PremiumFooter />
			</div>
		</>
	);
}
