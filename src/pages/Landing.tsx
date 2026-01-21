import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

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
		new Set()
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
			{ threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
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
							i === 2
								? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
								: "bg-white/5 text-white"
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
					scrolled ? "pt-4" : "pt-6"
				)}>
				<nav
					className={cn(
						"relative flex items-center justify-between transition-all duration-500 ease-out border backdrop-blur-2xl",
						scrolled
							? "w-full max-w-4xl h-12 rounded-full bg-[#0a0a0a]/80 border-white/10 shadow-lg px-6"
							: "w-full max-w-6xl h-16 bg-transparent border-transparent px-2"
					)}>
					<div
						className="flex items-center gap-2 cursor-pointer group"
						onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
						<div
							className={cn(
								"flex items-center justify-center transition-all duration-300",
								scrolled
									? "w-7 h-7 rounded-full bg-emerald-500/10"
									: "w-8 h-8 rounded-xl bg-emerald-500/10"
							)}>
							<Zap
								className={cn(
									"transition-all duration-300 text-emerald-500",
									scrolled ? "w-3 h-3" : "w-4 h-4"
								)}
							/>
						</div>
						<span
							className={cn(
								"font-bold tracking-tight text-white transition-all",
								scrolled ? "text-sm" : "text-base",
								"hidden md:inline"
							)}>
							ArenaSys
						</span>
						<span
							className={cn(
								"md:hidden font-bold tracking-tight text-white",
								"overflow-hidden whitespace-nowrap",
								"transition-[max-width,opacity,transform] duration-300 ease-out",
								showBrandTextMobile
									? "max-w-[140px] opacity-100 translate-x-0"
									: "max-w-0 opacity-0 -translate-x-2"
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
								scrolled
									? "h-8 px-4 text-xs bg-white text-black hover:bg-gray-200"
									: "h-9 px-5 text-sm bg-emerald-500 text-black hover:bg-emerald-400"
							)}>
							Criar Conta
						</Button>
					</div>

					<button
						className="md:hidden p-2 text-gray-400 hover:text-white"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
						{mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
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
						Infraestrutura Financeira para ArenaSys
					</div>

					<h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
						Transforme horários vazios em <br />
						<span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-600">
							faturamento previsível.
						</span>
					</h1>

					<p className="text-base md:text-lg text-gray-400 max-w-lg mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
						Pare de vender "horário" e comece a construir uma máquina de lucro.
						<span className="text-white font-medium">
							{" "}
							Sem WhatsApp. Sem calote. Sem caos.
						</span>
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
						<Button
							onClick={() => navigate("/login")}
							className="h-11 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">
							Começar com Pro (R$ 97/mês*)
						</Button>
						<button className="flex items-center gap-2 text-gray-400 hover:text-white transition font-medium px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 text-xs">
							<Play className="w-3 h-3 fill-current" /> Ver em ação
						</button>
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
			<section className="py-16 border-y border-white/5 bg-[#050507]">
				<div className="max-w-4xl mx-auto px-6 text-center">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
						<Zap className="w-4 h-4 text-emerald-400" />
						<p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
							Programa Founders
						</p>
					</div>
					<h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
						Seja um dos primeiros
					</h2>
					<p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
						Estamos lançando agora e oferecendo condições especiais para os primeiros arenas que se juntarem a nós. 
						Você terá acesso prioritário a novas funcionalidades e suporte dedicado.
					</p>
					{foundersProgress && foundersProgress.remaining > 0 && (
						<div className="mt-8 p-6 bg-white/[0.03] border border-white/5 rounded-2xl">
							<p className="text-sm text-gray-500 mb-2">Vagas disponíveis no programa founders</p>
							<div className="flex items-center justify-center gap-4">
								<div className="text-3xl font-bold text-emerald-400">
									{foundersProgress.remaining}
								</div>
								<div className="text-gray-500 text-sm">
									de {foundersProgress.cap} vagas
								</div>
							</div>
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
									<span className="text-gray-400 text-sm">Ocupação Média</span>
									<span className="text-red-400 font-mono font-bold">~45%</span>
								</div>
								<div className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
									<span className="text-gray-400 text-sm">
										Prejuízo Mensal (Vagos)
									</span>
									<span className="text-red-400 font-mono font-bold">
										- R$ 4.800
									</span>
								</div>
								<div className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
									<span className="text-gray-400 text-sm">
										Tempo no WhatsApp
									</span>
									<span className="text-red-400 font-mono font-bold">
										4h / dia
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
										+72% 🚀
									</span>
								</div>
								<div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
									<span className="text-white text-sm">Receita Recuperada</span>
									<span className="text-emerald-400 font-mono font-bold">
										+ R$ 6.400
									</span>
								</div>
								<div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
									<span className="text-white text-sm">Tempo de Gestão</span>
									<span className="text-emerald-400 font-mono font-bold">
										15 min / dia
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* --- SEÇÃO "POR QUE NÃO WHATSAPP?" --- */}
			<section id="comparison" className="py-20 px-6">
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
								<div className="text-sm font-medium text-white">{row.crit}</div>
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

			{/* --- PRICING --- */}
			<section
				id="pricing"
				className="py-20 px-6 bg-white/[0.01] border-t border-white/5">
				<div className="max-w-5xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-2xl md:text-4xl font-black text-white mb-3">
							Comece pequeno, cresça rápido.
						</h2>
						<p className="text-gray-400 text-sm max-w-lg mx-auto">
							Investimento ridículo:{" "}
							<span className="text-white font-bold">1 jogo extra no mês</span>{" "}
							já paga o sistema.
						</p>
					</div>
					<div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
						{/* PLANO PRO */}
						<div className="relative group rounded-2xl p-[1px] overflow-hidden transform hover:scale-[1.01] transition-all">
							<div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#10b981_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
							<div className="relative h-full bg-[#0F1115] rounded-2xl p-6 md:p-8 border border-white/10 group-hover:border-transparent transition-colors">
								<div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-bold px-3 py-1 rounded-bl-lg">
									RECOMENDADO
								</div>
								<h3 className="text-lg font-bold text-white mb-1">Arena Pro</h3>
								<p className="text-gray-400 text-xs mb-5">
									O melhor custo-benefício (cobrança anual).
								</p>
								<div className="flex items-baseline gap-1 mb-2">
									<span className="text-4xl font-black text-white">R$ 97</span>
									<span className="text-gray-500 text-xs">/mês*</span>
								</div>
								<p className="text-[10px] text-gray-500 mb-5">
									*cobrado R$ 1.164/ano.
								</p>
								<ul className="space-y-3 mb-8 text-xs md:text-sm">
									<li className="flex items-center gap-2 text-white">
										<Check className="w-4 h-4 text-emerald-500 shrink-0" /> Tudo
										do plano Start
									</li>
									<li className="flex items-center gap-2 text-white">
										<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
										<strong>Múltiplas Quadras</strong>
									</li>
									<li className="flex items-center gap-2 text-white">
										<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
										<strong>Gestão de Mensalistas</strong>
									</li>
									<li className="flex items-center gap-2 text-white">
										<Check className="w-4 h-4 text-emerald-500 shrink-0" />{" "}
										<strong>Relatórios Avançados</strong>
									</li>
								</ul>
								<Button
									onClick={() => navigate("/login")}
									className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
									Começar com Pro (R$ 97/mês*)
								</Button>
								{foundersProgress && (
									<div className="mt-3 space-y-2">
										<div className="flex items-center justify-between text-[10px] text-gray-500">
											<span>Founders 100</span>
											<span>
												{Math.max(0, foundersProgress.remaining)} vagas
											</span>
										</div>
										<div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
											<div
												className="h-full bg-emerald-500"
												style={{
													width: `${Math.min(
														100,
														(foundersProgress.sold / foundersProgress.cap) * 100
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
						{/* PLANO START */}
						<div className="relative bg-[#0a0c10] border border-white/10 rounded-2xl p-6 md:p-8 opacity-80 hover:opacity-100 transition-opacity">
							<h3 className="text-lg font-bold text-white mb-1">Arena Start</h3>
							<p className="text-gray-400 text-xs mb-5">
								Para operar o básico sem escala.
							</p>
							<div className="flex items-baseline gap-1 mb-5">
								<span className="text-4xl font-black text-white">R$ 149</span>
								<span className="text-gray-500 text-xs">/mês</span>
							</div>
							<ul className="space-y-3 mb-8 text-gray-400 text-xs md:text-sm">
								<li className="flex items-center gap-2">
									<Check className="w-4 h-4 text-white shrink-0" />{" "}
									<strong>Agenda Inteligente</strong>
								</li>
								<li className="flex items-center gap-2">
									<Check className="w-4 h-4 text-white shrink-0" />{" "}
									<strong>Link de Reservas</strong>
								</li>
								<li className="flex items-center gap-2">
									<Check className="w-4 h-4 text-white shrink-0" />{" "}
									<strong>Pagamento via Pix</strong>
								</li>
								<li className="flex items-center gap-2">
									<Check className="w-4 h-4 text-white shrink-0" />{" "}
									<strong>Gestão Financeira</strong>
								</li>
							</ul>
							<Button
								onClick={() => navigate("/login")}
								variant="outline"
								className="w-full h-10 border-white/20 hover:bg-white/5 text-white font-bold text-sm rounded-lg">
								Selecionar Start
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* --- NOVA SEÇÃO DE FAQ (PERGUNTAS FREQUENTES) --- */}
			<section id="faq" className="py-20 px-6">
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
						<Smartphone className="w-3 h-3" /> App Mobile (Q1 2025)
					</div>
					<div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400 flex items-center gap-2">
						<TrendingUp className="w-3 h-3" /> Torneios (Q2 2025)
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
								Quero Parar de Perder Dinheiro{" "}
								<ArrowRight className="w-5 h-5" />
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 text-center text-gray-600 text-[10px] border-t border-white/5 bg-[#02040a]">
				<div className="flex justify-center items-center gap-2 mb-2">
					<div className="w-4 h-4 bg-white/10 rounded flex items-center justify-center">
						<Zap className="w-2.5 h-2.5 text-white" />
					</div>
					<span className="font-bold text-white text-xs">ArenaSys</span>
				</div>
				<p>&copy; 2025 ArenaSys. Infraestrutura financeira para arenas.</p>
				<div className="flex justify-center gap-3 mt-4 opacity-50">
					<span className="flex items-center gap-1">
						<Lock className="w-2.5 h-2.5" /> Dados Criptografados
					</span>
					<span>•</span>
					<span className="flex items-center gap-1">
						<ShieldCheck className="w-2.5 h-2.5" /> Backups Diários
					</span>
				</div>
			</footer>
		</div>
	);
}
