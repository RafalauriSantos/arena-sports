import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Calendar,
	Smartphone,
	TrendingUp,
	Clock,
	Users,
	Zap,
	ArrowRight,
	Check,
	Play,
	ChevronDown,
} from "lucide-react";

// Hook for scroll animations
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

// iPhone 15 Pro Mockup Component
function IPhoneMockup({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`relative ${className}`}>
			{/* iPhone Frame */}
			<div className="relative w-[220px] md:w-[280px] h-[460px] md:h-[580px] bg-[#1a1a1a] rounded-[45px] md:rounded-[55px] p-[10px] md:p-[12px] shadow-2xl border border-[#333]">
				{/* Dynamic Island */}
				<div className="absolute top-[14px] md:top-[18px] left-1/2 -translate-x-1/2 w-[80px] md:w-[100px] h-[26px] md:h-[32px] bg-black rounded-full z-20" />

				{/* Screen */}
				<div className="relative w-full h-full bg-black rounded-[35px] md:rounded-[43px] overflow-hidden">
					{/* Status Bar */}
					<div className="absolute top-0 left-0 right-0 h-[40px] md:h-[50px] flex items-end justify-between px-5 md:px-6 pb-1 text-white text-xs font-medium z-10">
						<span className="text-[10px] md:text-xs">9:41</span>
						<div className="flex items-center gap-1">
							<div className="flex gap-[2px]">
								<div className="w-[2px] md:w-[3px] h-[8px] md:h-[10px] bg-white rounded-sm" />
								<div className="w-[2px] md:w-[3px] h-[8px] md:h-[10px] bg-white rounded-sm" />
								<div className="w-[2px] md:w-[3px] h-[8px] md:h-[10px] bg-white rounded-sm" />
								<div className="w-[2px] md:w-[3px] h-[8px] md:h-[10px] bg-white/40 rounded-sm" />
							</div>
							<div className="w-5 md:w-6 h-2.5 md:h-3 border border-white rounded-sm ml-1">
								<div className="w-3 md:w-4 h-full bg-white rounded-sm" />
							</div>
						</div>
					</div>

					{/* App Content */}
					<div className="pt-[40px] md:pt-[50px] h-full">{children}</div>
				</div>

				{/* Side Button */}
				<div className="absolute -right-[2px] top-[100px] md:top-[120px] w-[3px] h-[60px] md:h-[80px] bg-[#333] rounded-l" />
				<div className="absolute -left-[2px] top-[80px] md:top-[100px] w-[3px] h-[28px] md:h-[35px] bg-[#333] rounded-r" />
				<div className="absolute -left-[2px] top-[120px] md:top-[150px] w-[3px] h-[48px] md:h-[60px] bg-[#333] rounded-r" />
				<div className="absolute -left-[2px] top-[176px] md:top-[220px] w-[3px] h-[48px] md:h-[60px] bg-[#333] rounded-r" />
			</div>
		</div>
	);
}

// MacBook Pro Mockup Component
function MacBookMockup({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`relative ${className}`}>
			{/* Screen */}
			<div className="relative w-[320px] md:w-[700px] bg-[#1a1a1a] rounded-t-xl p-[6px] md:p-[8px] border-t border-l border-r border-[#333]">
				{/* Camera */}
				<div className="absolute top-[3px] md:top-[4px] left-1/2 -translate-x-1/2 w-1.5 md:w-2 h-1.5 md:h-2 bg-[#0a0a0a] rounded-full" />

				{/* Display */}
				<div className="w-full h-[200px] md:h-[420px] bg-black rounded-lg overflow-hidden mt-1.5 md:mt-2">
					{children}
				</div>
			</div>

			{/* Base */}
			<div className="relative w-[360px] md:w-[800px] h-[10px] md:h-[14px] bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-b-xl -ml-[20px] md:-ml-[50px] border-b border-l border-r border-[#333]">
				{/* Notch */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80px] md:w-[150px] h-[3px] md:h-[4px] bg-[#0a0a0a] rounded-b-lg" />
			</div>
		</div>
	);
}

// App Screen - Calendar View (for iPhone)
function CalendarAppScreen() {
	const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
	const dates = [14, 15, 16, 17, 18, 19, 20];

	return (
		<div className="h-full bg-black p-3 md:p-4">
			{/* Header */}
			<div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
				<div className="w-8 md:w-10 h-8 md:h-10 rounded-lg md:rounded-xl bg-[#00FF00]/20 flex items-center justify-center">
					<span className="text-sm md:text-lg">⚽</span>
				</div>
				<div>
					<h3 className="text-white font-bold text-xs md:text-sm">
						Arena Sport
					</h3>
					<p className="text-white/50 text-[10px] md:text-xs">
						Escolha seu horário
					</p>
				</div>
			</div>

			{/* Date Strip */}
			<div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6 overflow-hidden">
				{days.slice(0, 5).map((day, i) => (
					<div
						key={day}
						className={`flex flex-col items-center p-1.5 md:p-2 rounded-lg md:rounded-xl min-w-[32px] md:min-w-[40px] ${
							i === 3 ? "bg-[#00FF00] text-black" : "bg-white/5 text-white/70"
						}`}>
						<span className="text-[8px] md:text-[10px] font-medium">{day}</span>
						<span
							className={`text-xs md:text-sm font-bold ${
								i === 3 ? "text-black" : "text-white"
							}`}>
							{dates[i]}
						</span>
					</div>
				))}
			</div>

			{/* Time Slots */}
			<div className="space-y-1.5 md:space-y-2">
				{["18:00", "19:00", "20:00", "21:00"].map((time, i) => (
					<div
						key={time}
						className={`flex items-center justify-between p-2 md:p-3 rounded-lg md:rounded-xl ${
							i === 1
								? "bg-[#00FF00]/10 border border-[#00FF00]/30"
								: "bg-white/5"
						}`}>
						<div className="flex items-center gap-2 md:gap-3">
							<span
								className={`text-sm md:text-lg font-bold ${
									i === 1 ? "text-[#00FF00]" : "text-white"
								}`}>
								{time}
							</span>
							<span
								className={`text-[8px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full ${
									i === 1
										? "bg-[#00FF00]/20 text-[#00FF00]"
										: "bg-white/10 text-white/50"
								}`}>
								{i === 1 ? "Disponível" : i === 2 ? "Reservado" : "Disponível"}
							</span>
						</div>
						{(i === 0 || i === 1 || i === 3) && (
							<span className="text-[#00FF00] font-bold text-xs md:text-sm">
								R$ 160
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

// App Screen - Dashboard View (for MacBook)
function DashboardAppScreen() {
	const chartData = [40, 65, 45, 80, 95, 100, 30];
	const maxValue = Math.max(...chartData);

	return (
		<div className="h-full bg-black p-3 md:p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-3 md:mb-6">
				<div className="flex items-center gap-2 md:gap-3">
					<div className="w-7 md:w-10 h-7 md:h-10 rounded-lg md:rounded-xl bg-[#00FF00]/20 flex items-center justify-center">
						<span className="text-sm md:text-lg">⚽</span>
					</div>
					<div>
						<h3 className="text-white font-bold text-xs md:text-base">
							Arena Sports Dashboard
						</h3>
						<p className="text-white/50 text-[8px] md:text-xs">
							Painel Administrativo
						</p>
					</div>
				</div>
				<div className="flex gap-1 md:gap-2">
					<div className="px-2 md:px-3 py-1 md:py-1.5 bg-white/5 rounded-md md:rounded-lg text-white/70 text-[8px] md:text-xs">
						Hoje
					</div>
					<div className="px-2 md:px-3 py-1 md:py-1.5 bg-[#00FF00] rounded-md md:rounded-lg text-black text-[8px] md:text-xs font-medium">
						Semana
					</div>
				</div>
			</div>

			{/* KPIs */}
			<div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-6">
				<div className="bg-gradient-to-br from-[#00FF00]/20 to-[#00FF00]/5 rounded-xl md:rounded-2xl p-2 md:p-4 border border-[#00FF00]/20">
					<p className="text-white/50 text-[7px] md:text-xs mb-0.5 md:mb-1">
						Faturamento Hoje
					</p>
					<p className="text-[#00FF00] text-sm md:text-2xl font-black">
						R$ 1.450
					</p>
					<p className="text-[#00FF00]/70 text-[7px] md:text-xs mt-0.5 md:mt-1">
						+23% vs ontem
					</p>
				</div>
				<div className="bg-white/5 rounded-xl md:rounded-2xl p-2 md:p-4 border border-white/10">
					<p className="text-white/50 text-[7px] md:text-xs mb-0.5 md:mb-1">
						Jogos Agendados
					</p>
					<p className="text-white text-sm md:text-2xl font-black">8</p>
					<p className="text-white/50 text-[7px] md:text-xs mt-0.5 md:mt-1">
						Confirmados
					</p>
				</div>
				<div className="bg-white/5 rounded-xl md:rounded-2xl p-2 md:p-4 border border-white/10">
					<p className="text-white/50 text-[7px] md:text-xs mb-0.5 md:mb-1">
						Taxa de Ocupação
					</p>
					<p className="text-white text-sm md:text-2xl font-black">87%</p>
					<p className="text-white/50 text-[7px] md:text-xs mt-0.5 md:mt-1">
						Excelente
					</p>
				</div>
			</div>

			{/* Chart */}
			<div className="bg-white/5 rounded-xl md:rounded-2xl p-2 md:p-4 border border-white/10">
				<p className="text-white/70 text-[9px] md:text-sm font-medium mb-2 md:mb-4">
					Receita Semanal
				</p>
				<div className="flex items-end justify-between h-[50px] md:h-[120px] gap-1 md:gap-2">
					{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, i) => (
						<div
							key={day}
							className="flex flex-col items-center gap-1 md:gap-2 flex-1">
							<div
								className="w-full bg-gradient-to-t from-[#00FF00] to-[#00FF00]/50 rounded-t"
								style={{ height: `${(chartData[i] / maxValue) * 100}%` }}
							/>
							<span className="text-white/50 text-[6px] md:text-[10px]">
								{day}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default function Landing() {
	const navigate = useNavigate();
	const visibleElements = useScrollAnimation();
	const heroRef = useRef<HTMLDivElement>(null);

	const isVisible = (id: string) => visibleElements.has(id);

	const scrollToNext = () => {
		const problemSection = document.getElementById("problem");
		problemSection?.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<div className="min-h-screen bg-black text-white overflow-x-hidden">
			{/* Navigation */}
			<nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-2" data-testid="landing-logo">
						<span className="text-2xl">⚽</span>
						<span className="text-xl font-black">Arena Sports</span>
					</div>
					<div className="hidden md:flex items-center gap-8 text-sm text-white/70">
						<a
							href="#features"
							className="hover:text-white transition-colors"
							data-testid="nav-features">
							Funcionalidades
						</a>
						<a
							href="#pricing"
							className="hover:text-white transition-colors"
							data-testid="nav-pricing">
							Planos
						</a>
						<button
							onClick={() => navigate("/admin/login")}
							className="text-white/70 hover:text-white transition-colors"
							data-testid="nav-login">
							Entrar
						</button>
					</div>
					<button
						onClick={() => navigate("/admin/login")}
						className="px-5 py-2.5 bg-[#00FF00] text-black font-semibold rounded-full text-sm hover:bg-[#00FF00]/90 transition-all hover:shadow-[0_0_30px_rgba(0,255,0,0.3)]"
						data-testid="nav-cta">
						Agendar Demonstração
					</button>
				</div>
			</nav>

			{/* Hero Section */}
			<section
				ref={heroRef}
				className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20"
				data-testid="hero-section">
				{/* Gradient Orb */}
				<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00FF00]/5 rounded-full blur-[150px] pointer-events-none" />

				<div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
					{/* Badge */}
					<div
						className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-sm text-white/70"
						data-testid="hero-badge">
						<span className="w-2 h-2 bg-[#00FF00] rounded-full animate-pulse" />
						Plataforma #1 em Gestão de Arenas
					</div>

					{/* Headline */}
					<h1
						className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9]"
						data-testid="hero-headline">
						Sua Arena em
						<br />
						<span className="text-[#00FF00]">Alta Performance.</span>
					</h1>

					{/* Subheadline */}
					<p
						className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed"
						data-testid="hero-subheadline">
						Abandone o caos do WhatsApp. Organize agendamentos, atraia jogadores
						e maximize seu lucro com a plataforma de gestão mais avançada do
						esporte.
					</p>

					{/* CTAs */}
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
						<button
							onClick={() => navigate("/admin/login")}
							className="group px-8 py-4 bg-[#00FF00] text-black font-bold rounded-full text-lg hover:bg-[#00FF00]/90 transition-all hover:shadow-[0_0_40px_rgba(0,255,0,0.4)] flex items-center gap-2"
							data-testid="hero-cta-primary">
							Agendar Demonstração
							<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
						</button>
						<button
							onClick={() => navigate("/agendar")}
							className="px-8 py-4 bg-white/5 text-white font-semibold rounded-full text-lg border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
							data-testid="hero-cta-secondary">
							<Play className="w-5 h-5" />
							Ver Demo ao Vivo
						</button>
					</div>
				</div>

				{/* Scroll Indicator */}
				<button
					onClick={scrollToNext}
					className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 hover:text-white/60 transition-colors animate-bounce"
					data-testid="scroll-indicator">
					<ChevronDown className="w-8 h-8" />
				</button>
			</section>

			{/* Problem Section */}
			<section id="problem" className="py-32 px-6">
				<div
					id="problem-content"
					data-animate
					className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${
						isVisible("problem-content")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					<p className="text-[#00FF00] text-sm font-medium tracking-widest uppercase mb-6">
						O Problema
					</p>
					<h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">
						Você ainda gerencia sua arena pelo WhatsApp?
					</h2>
					<div className="grid md:grid-cols-3 gap-6 text-left mt-12">
						{[
							{
								icon: "📱",
								title: "Mensagens infinitas",
								desc: 'Horas perdidas respondendo "tem horário?" pelo WhatsApp',
							},
							{
								icon: "📊",
								title: "Zero controle",
								desc: "Sem visibilidade de faturamento, ocupação ou tendências",
							},
							{
								icon: "💸",
								title: "Dinheiro na mesa",
								desc: "Horários vagos que poderiam estar gerando receita",
							},
						].map((item, i) => (
							<div
								key={i}
								className="p-6 bg-white/[0.02] rounded-2xl border border-white/5">
								<span className="text-3xl mb-4 block">{item.icon}</span>
								<h3 className="text-lg font-bold mb-2">{item.title}</h3>
								<p className="text-white/50 text-sm">{item.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Solution / Mockups Section */}
			<section className="py-32 px-6 overflow-hidden">
				<div
					id="solution-header"
					data-animate
					className={`max-w-4xl mx-auto text-center mb-20 transition-all duration-1000 ${
						isVisible("solution-header")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					<p className="text-[#00FF00] text-sm font-medium tracking-widest uppercase mb-6">
						A Solução
					</p>
					<h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
						Uma experiência premium.
						<br />
						Para você e seus jogadores.
					</h2>
					<p className="text-white/50 text-lg max-w-xl mx-auto">
						Duas interfaces perfeitas. Uma para gerenciar. Outra para converter.
					</p>
				</div>

				{/* Mockups Grid */}
				<div className="max-w-7xl mx-auto">
					{/* Desktop Mockup */}
					<div
						id="mockup-desktop"
						data-animate
						className={`flex justify-center mb-20 transition-all duration-1000 delay-200 ${
							isVisible("mockup-desktop")
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-20"
						}`}>
						<div className="relative">
							<div className="absolute -inset-20 bg-[#00FF00]/5 rounded-full blur-[100px]" />
							<MacBookMockup className="relative z-10 transform hover:scale-[1.02] transition-transform duration-500">
								<DashboardAppScreen />
							</MacBookMockup>
							<div className="text-center mt-8">
								<p className="text-white/70 font-medium">Painel do Dono</p>
								<p className="text-white/40 text-sm">
									Controle total em tempo real
								</p>
							</div>
						</div>
					</div>

					{/* Mobile Mockup */}
					<div
						id="mockup-mobile"
						data-animate
						className={`flex justify-center transition-all duration-1000 delay-300 ${
							isVisible("mockup-mobile")
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-20"
						}`}>
						<div className="relative">
							<div className="absolute -inset-20 bg-[#00FF00]/5 rounded-full blur-[100px]" />
							<IPhoneMockup className="relative z-10 transform hover:scale-[1.02] transition-transform duration-500">
								<CalendarAppScreen />
							</IPhoneMockup>
							<div className="text-center mt-8">
								<p className="text-white/70 font-medium">App do Jogador</p>
								<p className="text-white/40 text-sm">Reserve em 30 segundos</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features - Bento Grid */}
			<section id="features" className="py-32 px-6">
				<div
					id="features-header"
					data-animate
					className={`max-w-4xl mx-auto text-center mb-16 transition-all duration-1000 ${
						isVisible("features-header")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					<p className="text-[#00FF00] text-sm font-medium tracking-widest uppercase mb-6">
						Funcionalidades
					</p>
					<h2 className="text-3xl md:text-5xl font-black leading-tight">
						Foco no que faz diferença.
						<br />
						Simples, eficiente, Arena Sports.
					</h2>
				</div>

				{/* Bento Grid */}
				<div
					id="bento-grid"
					data-animate
					className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-1000 delay-200 ${
						isVisible("bento-grid")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					{/* Large Card */}
					<div className="lg:col-span-2 p-8 bg-gradient-to-br from-[#00FF00]/10 to-transparent rounded-3xl border border-[#00FF00]/20 group hover:border-[#00FF00]/40 transition-all">
						<div className="w-14 h-14 bg-[#00FF00]/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
							<Calendar className="w-7 h-7 text-[#00FF00]" />
						</div>
						<h3 className="text-2xl font-bold mb-3">Agenda Inteligente</h3>
						<p className="text-white/50 leading-relaxed">
							Visualize todos os horários em tempo real. Bloqueie, libere e
							gerencie reservas com um clique. Sem planilhas, sem confusão.
						</p>
					</div>

					{/* Regular Cards */}
					<div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Smartphone className="w-6 h-6 text-white/70" />
						</div>
						<h3 className="text-lg font-bold mb-2">Link Público</h3>
						<p className="text-white/40 text-sm">
							Compartilhe um único link. Jogadores reservam sozinhos.
						</p>
					</div>

					<div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<TrendingUp className="w-6 h-6 text-white/70" />
						</div>
						<h3 className="text-lg font-bold mb-2">Dashboard Financeiro</h3>
						<p className="text-white/40 text-sm">
							Faturamento em tempo real. Gráficos claros. Decisões inteligentes.
						</p>
					</div>

					<div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Clock className="w-6 h-6 text-white/70" />
						</div>
						<h3 className="text-lg font-bold mb-2">Gestão de Mensalistas</h3>
						<p className="text-white/40 text-sm">
							Horários fixos para seus melhores clientes. Fidelização
							automática.
						</p>
					</div>

					<div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Users className="w-6 h-6 text-white/70" />
						</div>
						<h3 className="text-lg font-bold mb-2">Multi-Quadras</h3>
						<p className="text-white/40 text-sm">
							Gerencie múltiplas quadras em um único painel unificado.
						</p>
					</div>

					<div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Zap className="w-6 h-6 text-white/70" />
						</div>
						<h3 className="text-lg font-bold mb-2">Pagamento PIX</h3>
						<p className="text-white/40 text-sm">
							Receba antecipado. Sem risco de no-show. Fluxo de caixa saudável.
						</p>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-32 px-6 border-y border-white/5">
				<div
					id="stats"
					data-animate
					className={`max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-1000 ${
						isVisible("stats")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					{[
						{ value: "50+", label: "Arenas Ativas" },
						{ value: "10k+", label: "Reservas/Mês" },
						{ value: "98%", label: "Satisfação" },
						{ value: "24h", label: "Suporte" },
					].map((stat, i) => (
						<div key={i} className="text-center">
							<p className="text-4xl md:text-5xl font-black text-[#00FF00] mb-2">
								{stat.value}
							</p>
							<p className="text-white/40 text-sm">{stat.label}</p>
						</div>
					))}
				</div>
			</section>

			{/* Testimonial */}
			<section className="py-32 px-6">
				<div
					id="testimonial"
					data-animate
					className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${
						isVisible("testimonial")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					<div className="p-12 bg-white/[0.02] rounded-3xl border border-white/5">
						<p className="text-2xl md:text-3xl font-medium leading-relaxed mb-8">
							"Antes eu perdia 3 horas por dia no WhatsApp. Agora os jogadores
							reservam sozinhos e eu foco no que importa:
							<span className="text-[#00FF00]">
								{" "}
								fazer minha arena crescer.
							</span>
							"
						</p>
						<div className="flex items-center justify-center gap-4">
							<div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-lg">
								👤
							</div>
							<div className="text-left">
								<p className="font-semibold">Carlos Silva</p>
								<p className="text-white/40 text-sm">
									Arena Gol de Placa • São Paulo
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Pricing Section */}
			<section id="pricing" className="py-32 px-6">
				<div
					id="pricing-header"
					data-animate
					className={`max-w-4xl mx-auto text-center mb-16 transition-all duration-1000 ${
						isVisible("pricing-header")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					<p className="text-[#00FF00] text-sm font-medium tracking-widest uppercase mb-6">
						Investimento
					</p>
					<h2 className="text-3xl md:text-5xl font-black leading-tight">
						Simples e transparente.
					</h2>
				</div>

				<div
					id="pricing-card"
					data-animate
					className={`max-w-md mx-auto transition-all duration-1000 delay-200 ${
						isVisible("pricing-card")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					<div className="p-8 bg-gradient-to-br from-[#00FF00]/10 to-transparent rounded-3xl border border-[#00FF00]/30 relative overflow-hidden">
						<div className="absolute top-4 right-4 px-3 py-1 bg-[#00FF00] text-black text-xs font-bold rounded-full">
							POPULAR
						</div>

						<h3 className="text-2xl font-bold mb-2">Profissional</h3>
						<p className="text-white/50 mb-6">Para arenas que querem crescer</p>

						<div className="mb-8">
							<span className="text-5xl font-black">R$ 197</span>
							<span className="text-white/50">/mês</span>
						</div>

						<ul className="space-y-4 mb-8">
							{[
								"Quadras ilimitadas",
								"Agendamentos ilimitados",
								"Dashboard financeiro completo",
								"Link público personalizado",
								"Gestão de mensalistas",
								"Suporte prioritário",
							].map((feature, i) => (
								<li key={i} className="flex items-center gap-3 text-white/70">
									<Check className="w-5 h-5 text-[#00FF00]" />
									{feature}
								</li>
							))}
						</ul>

						<button
							onClick={() => navigate("/admin/login")}
							className="w-full py-4 bg-[#00FF00] text-black font-bold rounded-full text-lg hover:bg-[#00FF00]/90 transition-all hover:shadow-[0_0_40px_rgba(0,255,0,0.4)]">
							Começar Agora
						</button>
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section className="py-32 px-6">
				<div
					id="final-cta"
					data-animate
					className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${
						isVisible("final-cta")
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}>
					<h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
						Pronto para transformar
						<br />
						sua arena?
					</h2>
					<p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
						Agende uma demonstração gratuita e veja como o Arena Sports pode
						aumentar seu faturamento.
					</p>
					<button
						onClick={() => navigate("/admin/login")}
						className="group px-10 py-5 bg-[#00FF00] text-black font-bold rounded-full text-xl hover:bg-[#00FF00]/90 transition-all hover:shadow-[0_0_60px_rgba(0,255,0,0.5)] flex items-center gap-3 mx-auto">
						Agendar Demonstração
						<ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
					</button>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-12 px-6 border-t border-white/5">
				<div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="flex items-center gap-2">
						<span className="text-xl">⚽</span>
						<span className="font-bold">Arena Sports</span>
					</div>
					<p className="text-white/30 text-sm">
						© 2025 Arena Sports. Todos os direitos reservados.
					</p>
					<div className="flex items-center gap-6 text-sm text-white/40">
						<a href="#" className="hover:text-white transition-colors">
							Termos
						</a>
						<a href="#" className="hover:text-white transition-colors">
							Privacidade
						</a>
						<a href="#" className="hover:text-white transition-colors">
							Contato
						</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
