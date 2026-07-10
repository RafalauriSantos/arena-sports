import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
	Zap,
	Check,
	ArrowRight,
	Sparkles,
	MessageSquare,
	CreditCard,
	CalendarDays,
	BarChart3,
	Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { PremiumFooter } from "@/components/PremiumFooter";

// --- CONSTANTES PRÉ-CALCULADAS (evita recálculo a cada render) ---
const STARS_CONFIG = Array.from({ length: 25 }, (_, i) => ({
	id: i,
	width: Math.random() > 0.8 ? 2 : 1,
	left: Math.random() * 100,
	top: Math.random() * 100,
	opacity: 0.1 + Math.random() * 0.4,
	duration: 3 + Math.random() * 3,
	delay: Math.random() * 4,
}));

const faqList = [
	{
		question: "Quanto tempo leva para começar?",
		answer: "A configuração inicial é simples: você cadastra quadras, horários, valores e já pode compartilhar o link de reserva com seus clientes.",
	},
	{
		question: "Meu cliente precisa instalar aplicativo?",
		answer: "Não. O cliente acessa o link pelo navegador do celular, escolhe o horário disponível e envia a solicitação de reserva.",
	},
	{
		question: "Eu preciso parar de usar WhatsApp?",
		answer: "Não. O WhatsApp pode continuar como canal de relacionamento. A diferença é que a agenda e o controle deixam de depender só das conversas.",
	},
	{
		question: "Como funciona o pagamento da reserva?",
		answer: "Você pode manter o fluxo atual: pagamento no local ou combinado pelo WhatsApp. O ArenaSys ajuda a organizar reserva, status e acompanhamento.",
	},
	{
		question: "Funciona para mais de uma quadra?",
		answer: "Sim. Você pode cadastrar múltiplas quadras, horários e regras para organizar a disponibilidade da arena em uma visão única.",
	},
	{
		question: "Preciso de cartão para testar?",
		answer: "Não. O teste começa sem cartão, para você validar se o fluxo faz sentido na operação real da sua arena.",
	},
];

function usePrefersReducedMotion() {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !("matchMedia" in window)) return;
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
		handleChange();
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", handleChange);
			return () => mediaQuery.removeEventListener("change", handleChange);
		}
		mediaQuery.addListener(handleChange);
		return () => mediaQuery.removeListener(handleChange);
	}, []);

	return prefersReducedMotion;
}

// --- HOOK: ANIMAÇÃO DE CONTAGEM (Count-Up) ---
function useCountUp(
	end: number,
	duration: number = 2000,
	shouldStart: boolean = true,
	decimals: number = 0,
	prefersReducedMotion: boolean = false,
): number {
	const [count, setCount] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const hasStartedRef = useRef(false);

	useEffect(() => {
		if (!shouldStart) return;
		if (prefersReducedMotion) {
			setCount(end);
			return;
		}
		if (hasStartedRef.current) return;
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
	}, [end, duration, shouldStart, decimals, prefersReducedMotion]);

	return count;
}

// --- HOOK: DETECTAR VISIBILIDADE (IntersectionObserver) ---
function useInView(
	options?: IntersectionObserverInit,
	disabled: boolean = false,
): [React.RefObject<HTMLDivElement>, boolean] {
	const ref = useRef<HTMLDivElement>(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		if (disabled) {
			setIsInView(true);
			return;
		}
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
	}, [options, disabled]);

	return [ref, isInView];
}

// --- HOOK: ROTATING TEXT (Apple-style) ---
function useRotatingText(
	words: string[],
	interval: number = 3000,
	prefersReducedMotion: boolean = false,
) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		if (prefersReducedMotion) return;
		const timer = setInterval(() => {
			setIsAnimating(true);
			setTimeout(() => {
				setCurrentIndex((prev) => (prev + 1) % words.length);
				setIsAnimating(false);
			}, 300);
		}, interval);
		return () => clearInterval(timer);
	}, [words.length, interval, prefersReducedMotion]);

	return {
		word: prefersReducedMotion ? (words[0] ?? "") : words[currentIndex],
		isAnimating: prefersReducedMotion ? false : isAnimating,
	};
}

// --- HOOK: 3D TILT EFFECT ---
function useTilt(intensity: number = 15) {
	const ref = useRef<HTMLDivElement>(null);
	const [style, setStyle] = useState({
		transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)",
	});
	const prefersReducedMotion = usePrefersReducedMotion();

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!ref.current) return;
			const rect = ref.current.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const centerX = rect.width / 2;
			const centerY = rect.height / 2;
			const rotateX = ((y - centerY) / centerY) * -intensity;
			const rotateY = ((x - centerX) / centerX) * intensity;
			setStyle({
				transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
			});
		},
		[intensity],
	);

	const handleMouseLeave = useCallback(() => {
		setStyle({
			transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
		});
	}, []);

	useEffect(() => {
		if (prefersReducedMotion) return;
		const element = ref.current;
		if (!element) return;
		element.addEventListener("mousemove", handleMouseMove);
		element.addEventListener("mouseleave", handleMouseLeave);
		return () => {
			element.removeEventListener("mousemove", handleMouseMove);
			element.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [handleMouseMove, handleMouseLeave, prefersReducedMotion]);

	return { ref, style };
}

// --- COMPONENTE: TILT CARD ---
function TiltCard({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const { ref, style } = useTilt(8);
	return (
		<div
			ref={ref}
			style={{ ...style, transition: "transform 0.15s ease-out" }}
			className={className}>
			{children}
		</div>
	);
}

// --- COMPONENTE: SHIMMER BUTTON ---
function ShimmerButton({
	children,
	onClick,
	className = "",
}: {
	children: React.ReactNode;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			onClick={onClick}
			className={`relative overflow-hidden group ${className}`}>
			<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
			{children}
		</button>
	);
}

// --- COMPONENTE: SCROLL REVEAL ---
function ScrollReveal({
	children,
	delay = 0,
	className = "",
}: {
	children: React.ReactNode;
	delay?: number;
	className?: string;
}) {
	const prefersReducedMotion = usePrefersReducedMotion();
	const [ref, isInView] = useInView(undefined, prefersReducedMotion);
	return (
		<div
			ref={ref}
			className={`transition-all duration-1000 ease-out ${className}`}
			style={{
				transform: isInView ? "translateY(0)" : "translateY(40px)",
				opacity: isInView ? 1 : 0,
				transitionDelay: `${delay}ms`,
			}}>
			{children}
		</div>
	);
}

// --- HOOK: TYPEWRITER EFFECT ---
function IPhoneMockup({ children }: { children: React.ReactNode }) {
	return (
		<div className="landing-device relative transform hover:scale-[1.02] transition-transform duration-500">
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
		<div className="landing-device relative transform hover:scale-[1.01] transition-transform duration-500">
			<div className="relative w-[280px] md:w-[580px] bg-[#121212] rounded-t-xl p-1.5 border border-[#333] shadow-2xl">
				<div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 marketing-dark-deep rounded-full" />
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

// --- TELAS FAKE ÔÇö ULTRA REALISTAS ---

// Tela do iPhone: App de Reservas do Cliente (decorativo - aria-hidden)
function CalendarAppScreen() {
	const [selectedTime, setSelectedTime] = useState<string | null>("19:00");

	return (
		<div
			className="h-full marketing-dark-deep font-sans flex flex-col overflow-hidden"
			aria-hidden="true">
			{/* Header com Arena Info */}
			<div className="relative px-4 pt-2 pb-3 border-b border-white/5">
				<div className="absolute inset-0 bg-gradient-to-b from-[var(--az-navy)]/20 to-transparent" />
				<div className="relative flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--az-navy)] shadow-lg shadow-[var(--az-navy)]/30">
						<span className="text-lg">ÔÜ¢</span>
					</div>
					<div className="flex-1">
						<span
							className="text-white font-bold text-[11px] leading-tight block"
							aria-hidden="true">
							Arena Gol de Placa
						</span>
						<div className="flex items-center gap-1.5 mt-0.5">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--az-turf)]" />
							<span className="text-[8px] font-medium text-[var(--az-turf)]">
								Aberto agora
							</span>
							<span className="text-gray-300 text-[8px]">ÔÇó 4.9 Ô¡É</span>
						</div>
					</div>
					<div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
						<span className="text-[10px]">­ƒÆ¼</span>
					</div>
				</div>
			</div>

			{/* Seletor de Quadra */}
			<div className="px-3 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
				{["Quadra 1", "Quadra 2", "Society"].map((q, i) => (
					<button
						key={q}
						className={`px-3 py-1.5 rounded-full text-[8px] font-bold whitespace-nowrap transition-all ${
							i === 0 ?
								"bg-[var(--az-navy)] text-white shadow-lg shadow-[var(--az-navy)]/30"
							:	"bg-white/5 text-gray-300 border border-white/10"
						}`}>
						{q}
					</button>
				))}
			</div>

			{/* Calend├írio Mini */}
			<div className="px-3 py-2">
				<div className="flex items-center justify-between mb-2">
					<span className="text-[9px] text-gray-300 font-medium">
						Janeiro 2026
					</span>
					<div className="flex gap-1">
						<div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[8px] text-gray-300">
							ÔåÉ
						</div>
						<div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[8px] text-gray-300">
							ÔåÆ
						</div>
					</div>
				</div>
				<div className="flex gap-1">
					{[
						{ day: "SEG", date: "13", available: true },
						{ day: "TER", date: "14", available: true },
						{ day: "QUA", date: "15", available: false },
						{ day: "QUI", date: "16", available: true, selected: true },
						{ day: "SEX", date: "17", available: true },
					].map((d, i) => (
						<div
							key={i}
							className={`flex-1 py-1.5 rounded-lg flex flex-col items-center transition-all ${
								d.selected ? "bg-[var(--az-navy)] shadow-lg shadow-[var(--az-navy)]/40"
								: d.available ? "bg-white/5 hover:bg-white/10"
								: "bg-white/[0.02] opacity-40"
							}`}>
							<span
								className={`text-[6px] font-medium ${d.selected ? "text-white/70" : "text-gray-300"}`}>
								{d.day}
							</span>
							<span
								className={`text-[11px] font-bold ${d.selected ? "text-white" : "text-white"}`}>
								{d.date}
							</span>
							{!d.available && (
								<span className="text-[5px] text-red-400">Lotado</span>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Hor├írios Dispon├¡veis */}
			<div className="flex-1 px-3 overflow-hidden">
				<span className="text-[8px] text-gray-300 font-medium uppercase tracking-wider">
					Hor├írios dispon├¡veis
				</span>
				<div className="mt-2 space-y-1.5 overflow-y-auto max-h-[140px] hide-scrollbar">
					{[
						{ time: "18:00", price: "R$ 120", status: "available" },
						{ time: "19:00", price: "R$ 120", status: "selected" },
						{
							time: "20:00",
							price: "R$ 150",
							status: "available",
							tag: "­ƒöÑ ├Ültimo",
						},
						{
							time: "21:00",
							price: "R$ 150",
							status: "occupied",
							occupant: "Jo├úo M.",
						},
						{ time: "22:00", price: "R$ 100", status: "available" },
					].map((slot) => (
						<div
							key={slot.time}
							onClick={() =>
								slot.status !== "occupied" && setSelectedTime(slot.time)
							}
							className={`p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
								slot.status === "selected" || selectedTime === slot.time ?
									"border-2 border-[var(--az-navy)] bg-[var(--az-navy)]/20 shadow-lg shadow-[var(--az-navy)]/10"
								: slot.status === "occupied" ?
									"bg-white/[0.02] border border-white/5 opacity-50"
								:	"bg-white/5 border border-white/5 hover:border-white/20"
							}`}>
							<div className="flex items-center gap-2">
								<div
									className={`w-7 h-7 rounded-lg flex items-center justify-center ${
										slot.status === "selected" || selectedTime === slot.time ?
											"bg-[var(--az-navy)] text-white"
										: slot.status === "occupied" ? "bg-red-500/20 text-red-400"
										: "bg-white/10 text-white"
									}`}>
									<span className="text-[10px] font-bold">
										{slot.time.split(":")[0]}
									</span>
								</div>
								<div>
									<span className="text-white font-bold text-[10px] block">
										{slot.time}
									</span>
									<span className="text-gray-300 text-[7px]">
										{slot.status === "occupied" ?
											`Reservado ÔÇó ${slot.occupant}`
										:	"1h de jogo"}
									</span>
								</div>
							</div>
							<div className="text-right">
								{slot.tag && (
									<span className="text-[6px] text-orange-400 font-bold block mb-0.5">
										{slot.tag}
									</span>
								)}
								<span
									className={`font-bold text-[10px] ${
										slot.status === "selected" || selectedTime === slot.time ?
											"text-[var(--az-turf)]"
										:	"text-white"
									}`}>
									{slot.price}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Bottom CTA */}
			<div className="p-3 border-t border-white/5 marketing-dark-deep-muted backdrop-blur">
				<button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--az-navy)] py-2.5 text-[11px] font-bold text-white shadow-lg shadow-[var(--az-navy)]/30 transition-transform active:scale-[0.98]">
					Confirmar Reserva ÔÇó R$ 120
					<span className="text-[10px]">ÔåÆ</span>
				</button>
			</div>
		</div>
	);
}

// Tela do MacBook: Dashboard Admin (decorativo - aria-hidden)
function DashboardAppScreen() {
	return (
		<div
			className="h-full marketing-dark-panel font-sans relative overflow-hidden flex"
			aria-hidden="true">
			{/* Sidebar Mini */}
			<div className="w-12 md:w-14 marketing-dark-deep border-r border-white/5 flex flex-col items-center py-3 gap-3">
				<div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--az-navy)] shadow-lg shadow-[var(--az-navy)]/30 md:h-8 md:w-8">
					<Zap className="h-3 w-3 text-white md:h-4 md:w-4" />
				</div>
				<div className="w-6 h-[1px] bg-white/10 my-1" />
				{[
					{ icon: "­ƒôè", active: true },
					{ icon: "­ƒôà", active: false },
					{ icon: "­ƒæÑ", active: false },
					{ icon: "­ƒÆ░", active: false },
					{ icon: "ÔÜÖ´©Å", active: false },
				].map((item, i) => (
					<div
						key={i}
						className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] transition-all cursor-pointer ${
							item.active ?
								"bg-[var(--az-navy)]/20 shadow-lg shadow-[var(--az-navy)]/10"
							:	"hover:bg-white/5"
						}`}>
						{item.icon}
					</div>
				))}
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-hidden">
				{/* Top Bar */}
				<div className="h-10 md:h-12 border-b border-white/5 flex items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<span
							className="text-white font-bold text-[11px] md:text-xs"
							aria-hidden="true">
							Dashboard
						</span>
						<span className="rounded-full border border-[var(--az-line)] bg-[var(--az-navy)]/20 px-2 py-0.5 text-[8px] font-bold text-[var(--az-turf)]">
							Tempo real
						</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="relative">
							<div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px]">
								­ƒöö
							</div>
							<div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						</div>
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--az-navy)] text-[8px] font-bold text-white">
							RL
						</div>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="p-3 md:p-4">
					{/* KPIs */}
					<div className="grid grid-cols-4 gap-2 md:gap-3 mb-4">
						{[
							{
								label: "Hoje",
								value: "R$ 2.340",
								change: "+18%",
								up: true,
								icon: "­ƒÆ░",
							},
							{
								label: "Reservas",
								value: "23",
								change: "+5",
								up: true,
								icon: "­ƒôà",
							},
							{
								label: "Ocupa├º├úo",
								value: "87%",
								change: "+12%",
								up: true,
								icon: "­ƒôê",
							},
							{
								label: "Cancelamentos",
								value: "2",
								change: "-3",
								up: false,
								icon: "ÔØî",
							},
						].map((kpi, i) => (
							<div
								key={i}
								className="p-2 md:p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group">
								<div className="flex items-center justify-between mb-1">
									<span className="text-[7px] md:text-[8px] text-gray-300 font-medium uppercase tracking-wider">
										{kpi.label}
									</span>
									<span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">
										{kpi.icon}
									</span>
								</div>
								<p className="text-white font-bold text-sm md:text-lg">
									{kpi.value}
								</p>
								<span
									className={`text-[7px] font-bold md:text-[8px] ${kpi.up ? "text-[var(--az-turf)]" : "text-[var(--az-clay)]"}`}>
									{kpi.change}
								</span>
							</div>
						))}
					</div>

					{/* Chart + Agenda Row */}
					<div className="grid grid-cols-5 gap-3">
						{/* Chart */}
						<div className="col-span-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
							<div className="flex items-center justify-between mb-3">
								<span className="text-[9px] text-gray-300 font-medium">
									Faturamento Semanal
								</span>
								<div className="flex gap-1">
									{["D", "S", "M"].map((p, i) => (
										<button
											key={p}
											className={`px-2 py-0.5 rounded text-[7px] font-bold ${
												i === 1 ?
													"bg-[var(--az-turf)]/20 text-[var(--az-turf)]"
												:	"text-gray-300"
											}`}>
											{p}
										</button>
									))}
								</div>
							</div>
							<div className="h-16 md:h-24 flex items-end gap-1">
								{[45, 65, 40, 80, 70, 95, 85].map((h, i) => (
									<div
										key={i}
										className="flex-1 flex flex-col items-center gap-1">
										<div
											className={`w-full rounded-t transition-all ${
												i === 5 ?
													"bg-[var(--az-navy)] shadow-lg shadow-[var(--az-navy)]/30"
												:	"bg-gradient-to-t from-white/10 to-white/20"
											}`}
											style={{ height: `${h}%` }}
										/>
										<span className="text-[6px] text-gray-400">
											{["Seg", "Ter", "Qua", "Qui", "Sex", "S├íb", "Dom"][i]}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Pr├│ximas Reservas */}
						<div className="col-span-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
							<span className="text-[9px] text-gray-300 font-medium block mb-2">
								Pr├│ximas Reservas
							</span>
							<div className="space-y-1.5">
								{[
									{
										time: "14:00",
										client: "Carlos S.",
										court: "Quadra 1",
										status: "confirmed",
									},
									{
										time: "15:00",
										client: "Ana M.",
										court: "Society",
										status: "pending",
									},
									{
										time: "16:00",
										client: "Pedro L.",
										court: "Quadra 2",
										status: "confirmed",
									},
								].map((res, i) => (
									<div
										key={i}
										className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
										<div
											className={`w-1 h-6 rounded-full ${
												res.status === "confirmed" ?
													"bg-[var(--az-turf)]"
												:	"bg-yellow-500"
											}`}
										/>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1">
												<span className="text-white font-bold text-[9px]">
													{res.time}
												</span>
												<span className="text-gray-400 text-[7px]">ÔÇó</span>
												<span className="text-gray-300 text-[8px] truncate">
													{res.client}
												</span>
											</div>
											<span className="text-gray-400 text-[7px]">
												{res.court}
											</span>
										</div>
										<div
											className={`px-1.5 py-0.5 rounded text-[6px] font-bold ${
												res.status === "confirmed" ?
													"bg-[var(--az-turf)]/20 text-[var(--az-turf)]"
												:	"bg-yellow-500/20 text-yellow-400"
											}`}>
											{res.status === "confirmed" ? "Ô£ô" : "ÔÅ│"}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


function OutcomeStrip() {
	const outcomes = [
		{
			value: "24/7",
			label: "reservas pelo link",
			desc: "O cliente consulta horários mesmo fora do atendimento da equipe.",
		},
		{
			value: "- mensagens",
			label: "no WhatsApp",
			desc: "A agenda deixa de depender de pergunta e resposta manual.",
		},
		{
			value: "+ controle",
			label: "por quadra",
			desc: "Reservas, bloqueios e pagamentos ficam claros para a operação.",
		},
	];

	return (
		<section className="relative bg-[var(--az-paper)] px-5 pb-8">
			<div className="mx-auto -mt-8 grid max-w-6xl gap-4 rounded-xl border border-[var(--az-line)] bg-[var(--az-surface)] p-4 shadow-[0_28px_90px_-58px_rgba(22,24,26,0.38)] md:grid-cols-3 md:p-6">
				{outcomes.map((item) => (
					<div
						key={item.label}
						className="rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] px-5 py-6">
						<p className="text-3xl font-semibold text-[var(--az-navy)]">
							{item.value}
						</p>
						<p className="mt-1 text-sm font-semibold uppercase text-[var(--az-ink)]">
							{item.label}
						</p>
						<p className="mt-3 text-sm leading-6 text-[var(--az-ink-soft)]">
							{item.desc}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

function ProductSuiteSection({
	onPrimaryAction,
}: {
	onPrimaryAction: () => void;
}) {
	const products = [
		{
			icon: CalendarDays,
			title: "Reservas por quadra",
			desc: "Mostre horários livres, bloqueios e reservas confirmadas por data, campo e modalidade.",
			result: "Agenda sempre consultável",
			action: "Organizar horários",
			tone: "blue",
		},
		{
			icon: MessageSquare,
			title: "Link público da arena",
			desc: "Compartilhe um endereço simples para o cliente escolher o horário sem instalar aplicativo.",
			result: "Menos conversa operacional",
			action: "Publicar link",
			tone: "cyan",
		},
		{
			icon: BarChart3,
			title: "Painel da operação",
			desc: "Acompanhe ocupação, receita prevista, pendências e fluxo do dia sem abrir planilhas.",
			result: "Decisão mais rápida",
			action: "Ver painel",
			tone: "indigo",
		},
		{
			icon: Users,
			title: "Mensalistas",
			desc: "Separe clientes fixos, horários recorrentes e pendências do fluxo de reservas avulsas.",
			result: "Recorrência sob controle",
			action: "Gerenciar fixos",
			tone: "amber",
		},
	];

	const toneClasses = {
		blue: "bg-[var(--az-navy-soft)] text-[var(--az-navy)] border-[var(--az-line)]",
		cyan: "bg-[var(--az-turf-soft)] text-[var(--az-turf)] border-[var(--az-line)]",
		indigo: "bg-[var(--az-navy-soft)] text-[var(--az-navy)] border-[var(--az-line)]",
		amber: "bg-[var(--az-paper)] text-[var(--az-clay)] border-[var(--az-line)]",
	};

	return (
		<section id="solucoes" className="relative scroll-mt-24 bg-[var(--az-surface)] px-4 py-24">
			<div className="mx-auto max-w-6xl">
				<div className="mb-12 grid gap-6 lg:grid-cols-[1fr_0.46fr] lg:items-end">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--az-navy)]">
							Soluções para arenas
						</p>
						<h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--az-ink)] md:text-5xl">
							Tudo que a operação precisa para vender horários com clareza.
						</h2>
						<p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--az-ink-soft)]">
							Assim como um cardápio digital organiza pedidos, o ArenaSys
							organiza a disponibilidade da sua arena: reservas, quadras,
							clientes e pagamentos em uma experiência única.
						</p>
					</div>
					<button
						onClick={onPrimaryAction}
						className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--az-navy)] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10283f] lg:justify-self-end">
						Escolher solução ideal
						<ArrowRight className="h-4 w-4" />
					</button>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{products.map((product) => (
						<article
							key={product.title}
							className="group flex min-h-[300px] flex-col rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-6 shadow-[0_20px_70px_-55px_rgba(22,24,26,0.45)] transition-all hover:-translate-y-1 hover:border-[var(--az-navy)] hover:shadow-xl hover:shadow-[var(--az-navy)]/10">
							<div
								className={cn(
									"mb-5 flex h-12 w-12 items-center justify-center rounded-xl border",
									toneClasses[product.tone as keyof typeof toneClasses],
								)}>
								<product.icon className="h-6 w-6" />
							</div>
							<h3 className="text-xl font-semibold text-[var(--az-ink)]">
								{product.title}
							</h3>
							<p className="mt-3 flex-1 text-sm leading-6 text-[var(--az-ink-soft)]">
								{product.desc}
							</p>
							<div className="mt-5 rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--az-ink-soft)]">
								{product.result}
							</div>
							<button
								onClick={onPrimaryAction}
								className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--az-navy)] transition-colors group-hover:text-[#10283f]">
								{product.action}
								<ArrowRight className="h-4 w-4" />
							</button>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

// --- PÁGINA PRINCIPAL ---

export default function LandingPage() {
	const navigate = useNavigate();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const startSignup = () => navigate("/login?mode=signup");

	// Recuperação de senha: o email às vezes redireciona para a Site URL (/) em vez de /reset-password.
	// Sem isto, o token fica na home e a tela de "Nova senha" nunca aparece.
	useEffect(() => {
		if (typeof window === "undefined") return;
		const raw = window.location.hash.replace(/^#/, "");
		if (raw) {
			const hp = new URLSearchParams(raw);
			if (hp.get("error_code") === "otp_expired") {
				window.location.replace(
					"/login?mode=forgot-password&reset_error=otp_expired",
				);
				return;
			}
			if (hp.get("type") === "recovery") {
				window.location.replace(`/reset-password${window.location.hash}`);
				return;
			}
		}
		const sp = new URLSearchParams(window.location.search);
		if (sp.get("type") === "recovery" && sp.has("code")) {
			const q = window.location.search;
			window.location.replace(`/reset-password${q}`);
		}
	}, []);

	return (
		<>
			<SEO
				title="Sistema de reservas para arenas esportivas | ArenaSys"
				description="Organize quadras, horários, clientes e pagamentos em um link público e um painel simples para sua equipe acompanhar a operação da arena."
				keywords="sistema para gestão de quadras esportivas, sistema de agendamento de quadras, software para quadras esportivas, sistema para arenas esportivas, controle de horários de quadras, sistema para aluguel de quadras, gestão de arena esportiva"
				canonical="/"
			/>
			<main
				role="main"
				id="main-content"
				data-seo-ready
				className="landing-light relative min-h-dvh overflow-x-hidden scroll-smooth font-sans text-[var(--az-ink)] selection:bg-[var(--az-navy-soft)]">
				{/* ═══════════════════════════════════════════════════════════════════
				    🌌 COSMIC BACKGROUND — De cair o queixo
				    ═══════════════════════════════════════════════════════════════════ */}

				{/* Base: Gradiente profundo do cosmos */}
				<div
					className="fixed inset-0 pointer-events-none"
					style={{
						background: `
							radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
							radial-gradient(ellipse 60% 40% at 100% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 40%),
							radial-gradient(ellipse 60% 40% at 0% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 40%),
							linear-gradient(180deg, #020205 0%, #030308 50%, #020205 100%)
						`,
					}}
				/>

				{/* Aurora Borealis - ondas de luz etéreas (GPU accelerated) */}
				<div
					className="fixed inset-0 pointer-events-none overflow-hidden"
					style={{ willChange: "transform" }}>
					<div
						className="absolute -top-[50%] left-1/2 -translate-x-1/2 w-[200%] h-[100%] opacity-30"
						style={{
							background: `
								linear-gradient(180deg, 
									transparent 0%,
									rgba(16, 185, 129, 0.1) 20%,
									rgba(6, 182, 212, 0.08) 40%,
									rgba(16, 185, 129, 0.05) 60%,
									transparent 100%
								)
							`,
							animation: "aurora 15s ease-in-out infinite",
							filter: "blur(60px)",
							willChange: "transform",
							transform: "translateZ(0)",
						}}
					/>
					<div
						className="absolute -top-[30%] left-1/3 w-[150%] h-[80%] opacity-20"
						style={{
							background: `
								linear-gradient(160deg, 
									transparent 0%,
									rgba(6, 182, 212, 0.12) 30%,
									rgba(16, 185, 129, 0.08) 60%,
									transparent 100%
								)
							`,
							animation: "aurora 20s ease-in-out infinite reverse",
							filter: "blur(80px)",
							willChange: "transform",
							transform: "translateZ(0)",
						}}
					/>
				</div>

				{/* Starfield - estrelas piscantes (otimizado) */}
				<div
					className="fixed inset-0 pointer-events-none"
					style={{ willChange: "opacity" }}>
					{STARS_CONFIG.map((star) => (
						<div
							key={star.id}
							className="absolute rounded-full bg-white"
							style={{
								width: `${star.width}px`,
								height: `${star.width}px`,
								left: `${star.left}%`,
								top: `${star.top}%`,
								opacity: star.opacity,
								animation: `twinkle ${star.duration}s ease-in-out infinite`,
								animationDelay: `${star.delay}s`,
							}}
						/>
					))}
				</div>

				{/* Shooting stars ocasionais (GPU optimized) */}
				<div
					className="fixed inset-0 pointer-events-none overflow-hidden"
					style={{ willChange: "transform" }}>
					<div
						className="absolute w-[100px] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
						style={{
							top: "20%",
							left: "0",
							animation: "shootingStar 10s linear infinite",
							animationDelay: "3s",
							willChange: "transform, opacity",
						}}
					/>
					<div
						className="absolute w-[80px] h-[1px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent opacity-0"
						style={{
							top: "50%",
							left: "0",
							animation: "shootingStar 15s linear infinite",
							animationDelay: "8s",
							willChange: "transform, opacity",
						}}
					/>
				</div>

				{/* Nebula clouds - nuvens de gás cósmico */}
				<div className="fixed inset-0 pointer-events-none">
					<div
						className="absolute top-[10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-[0.04]"
						style={{
							background:
								"radial-gradient(circle, rgba(16, 185, 129, 0.8) 0%, transparent 70%)",
							filter: "blur(60px)",
							animation: "nebulaPulse 8s ease-in-out infinite",
						}}
					/>
					<div
						className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full opacity-[0.03]"
						style={{
							background:
								"radial-gradient(circle, rgba(6, 182, 212, 0.8) 0%, transparent 70%)",
							filter: "blur(50px)",
							animation: "nebulaPulse 10s ease-in-out infinite",
							animationDelay: "-5s",
						}}
					/>
				</div>

				{/* Horizon glow - linha do horizonte */}
				<div
					className="fixed bottom-0 left-0 right-0 h-[300px] pointer-events-none"
					style={{
						background: `
							linear-gradient(0deg, 
								rgba(16, 185, 129, 0.03) 0%,
								transparent 100%
							)
						`,
					}}
				/>

				{/* Perspective grid - grade 3D no fundo */}
				<div
					className="fixed inset-0 pointer-events-none opacity-[0.03]"
					style={{
						backgroundImage: `
							linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px)
						`,
						backgroundSize: "80px 80px",
						transform: "perspective(500px) rotateX(60deg)",
						transformOrigin: "center top",
						maskImage:
							"linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
						WebkitMaskImage:
							"linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
					}}
				/>

				{/* Estilos para Animações Apple-level (GPU optimized) */}
				<style>{`
        /* GPU Acceleration hints */
        .gpu-accelerate {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
        @keyframes aurora {
          0%, 100% { transform: translateX(-50%) translateY(0) skewX(0deg) translateZ(0); }
          25% { transform: translateX(-45%) translateY(-5%) skewX(-2deg) translateZ(0); }
          50% { transform: translateX(-55%) translateY(3%) skewX(2deg) translateZ(0); }
          75% { transform: translateX(-48%) translateY(-2%) skewX(-1deg) translateZ(0); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.7; }
        }
        @keyframes shootingStar {
          0% { transform: translateX(0) rotate(-45deg); opacity: 0; }
          5% { opacity: 0.8; }
          15% { transform: translateX(120vw) rotate(-45deg); opacity: 0; }
          100% { transform: translateX(120vw) rotate(-45deg); opacity: 0; }
        }
        @keyframes nebulaPulse {
          0%, 100% { opacity: 0.03; transform: scale(1) translateZ(0); }
          50% { opacity: 0.06; transform: scale(1.1) translateZ(0); }
        }
        @keyframes scroll {
          0% { transform: translateX(0) translateZ(0); }
          100% { transform: translateX(-50%) translateZ(0); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
          will-change: transform;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1) translateZ(0); }
          50% { opacity: 0.7; transform: scale(1.05) translateZ(0); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateZ(0); }
          50% { transform: translateY(-10px) translateZ(0); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes word-rotate-out {
          0% { opacity: 1; transform: translateY(0) rotateX(0); }
          100% { opacity: 0; transform: translateY(-20px) rotateX(-90deg); }
        }
        @keyframes word-rotate-in {
          0% { opacity: 0; transform: translateY(20px) rotateX(90deg); }
          100% { opacity: 1; transform: translateY(0) rotateX(0); }
        }
        .word-animating {
          animation: word-rotate-out 0.3s ease-in forwards;
        }
        .word-entering {
          animation: word-rotate-in 0.3s ease-out forwards;
        }
        @keyframes border-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.2); }
          50% { box-shadow: 0 0 40px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.2); }
        }
        .animate-border-glow {
          animation: border-glow 3s ease-in-out infinite;
        }
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        .btn-shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shine 3s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.8s step-end infinite;
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(12px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(12px) rotate(-360deg); }
        }
        .animate-orbit {
          animation: orbit 3s linear infinite;
        }
        @keyframes orbit-reverse {
          0% { transform: rotate(0deg) translateX(16px) rotate(0deg); }
          100% { transform: rotate(-360deg) translateX(16px) rotate(360deg); }
        }
        .animate-orbit-reverse {
          animation: orbit-reverse 4s linear infinite;
        }
        @keyframes text-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-text-shimmer {
          background: linear-gradient(90deg, #0f172a 0%, #1d4ed8 38%, #0284c7 52%, #0f172a 70%, #0f172a 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: text-shimmer 3s linear infinite;
        }
        .nav-link {
          position: relative;
          overflow: hidden;
        }
        .nav-link::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #2563eb, transparent);
          transition: all 0.3s ease;
          transform: translateX(-50%);
        }
        .nav-link:hover::before {
          width: 100%;
        }
        .goomer-style {
          font-family: "Nunito Sans", "Montserrat", "Arial Rounded MT Bold", "Aptos", "Trebuchet MS", system-ui, sans-serif;
          letter-spacing: 0;
        }
        .goomer-logo {
          font-family: "Nunito Sans", "Arial Rounded MT Bold", "Aptos", "Trebuchet MS", system-ui, sans-serif;
          font-weight: 950;
          letter-spacing: 0;
        }
        .goomer-hero-title {
          font-family: "Nunito Sans", "Arial Rounded MT Bold", "Aptos", "Trebuchet MS", system-ui, sans-serif;
          font-weight: 950;
          letter-spacing: 0;
        }
        .magnetic-btn {
          transition: transform 0.2s ease-out;
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .pulse-ring::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid #10b981;
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>

				{/* Background Global - Apple-style pulsing glow */}
				<div className="fixed inset-0 z-0 pointer-events-none">
					<div
						className="absolute inset-0 opacity-[0.02]"
						style={{
							backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
						}}
					/>
					<div className="absolute -top-[300px] left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--az-navy)]/10 blur-[120px] animate-pulse-glow" />
					<div
						className="absolute -right-[200px] top-[60%] h-[500px] w-[500px] rounded-full bg-[var(--az-turf)]/10 blur-[100px] animate-pulse-glow"
						style={{ animationDelay: "2s" }}
					/>
					<div
						className="absolute top-[30%] -left-[200px] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse-glow"
						style={{ animationDelay: "1s" }}
					/>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    NAVBAR — EXPERIÊNCIA VISUAL ÚNICA
				    ═══════════════════════════════════════════════════════════════════ */}
				<header className="landing-hero-header fixed left-0 right-0 top-0 z-50 flex justify-center px-5 py-5">
					<nav className="landing-hero-nav relative flex h-16 w-full max-w-6xl items-center justify-between overflow-visible">
						<div className="relative z-10 flex w-full items-center justify-between">
							<div
								className="flex cursor-pointer items-center rounded-xl py-1.5 group"
								onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
								<div className="leading-none">
									<span
										className="block text-[2.05rem] font-semibold leading-none text-white sm:text-[2.55rem]"
										style={{
											color: "#fff",
											WebkitTextFillColor: "#fff",
										}}>
										Arenasys
									</span>
								</div>
							</div>

							<div className="hidden items-center gap-2 md:flex">
								<a
									href="#solucoes"
									className="nav-link rounded-lg px-3 py-2 text-[0.93rem] font-semibold text-white transition-colors duration-300 hover:bg-white/12"
									style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>
									Soluções
								</a>
								<a
									href="#como-funciona"
									className="nav-link rounded-lg px-3 py-2 text-[0.93rem] font-semibold text-white transition-colors duration-300 hover:bg-white/12"
									style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>
									Como funciona
								</a>
								<a
									href="#comecar"
									className="nav-link rounded-lg px-3 py-2 text-[0.93rem] font-semibold text-white transition-colors duration-300 hover:bg-white/12"
									style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>
									Começar
								</a>
								<a
									href="#faq"
									className="nav-link rounded-lg px-3 py-2 text-[0.93rem] font-semibold text-white transition-colors duration-300 hover:bg-white/12"
									style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>
									FAQ
								</a>
							</div>

							<div className="hidden items-center gap-3 md:flex">
								<button
									onClick={() => navigate("/login")}
									aria-label="Fazer login no ArenaSys"
									className="rounded-lg border border-white/50 bg-transparent px-7 py-3 text-[0.93rem] font-semibold text-white transition-all duration-300 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
									style={{
										color: "#fff",
										WebkitTextFillColor: "#fff",
									}}>
									Entrar
								</button>
								<button
									onClick={() => navigate("/login?mode=signup")}
									className="relative h-12 overflow-hidden rounded-lg bg-[var(--az-surface)] px-7 text-[0.93rem] font-semibold text-[var(--az-navy)] shadow-lg shadow-blue-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--az-paper)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
									aria-label="Criar agenda online no ArenaSys">
									<span className="relative z-10 flex items-center gap-2">
										Criar agenda
										<ArrowRight className="h-4 w-4" />
									</span>
								</button>
							</div>

							<button
								className="relative rounded-lg border border-white/45 bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20 md:hidden"
								aria-label="Abrir menu de navegação"
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
								style={{ color: "#fff" }}>
								<div
									className={`h-0.5 w-5 bg-white transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-[3px]" : ""}`}
								/>
								<div
									className={`mt-1.5 h-0.5 w-5 bg-white transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""}`}
								/>
							</button>
						</div>

						{/* Mobile menu */}
						{mobileMenuOpen && (
							<div className="absolute left-0 right-0 top-full z-[100] mx-2 mt-3 overflow-hidden rounded-xl animate-in fade-in slide-in-from-top-4 duration-300 md:hidden">
								<div className="relative rounded-xl border border-[var(--az-line)] bg-[var(--az-surface)] p-5 shadow-2xl shadow-blue-950/20">
									<a
										href="#solucoes"
										onClick={() => setMobileMenuOpen(false)}
										className="block rounded-lg p-4 text-lg font-semibold text-[var(--az-ink)] transition-colors hover:bg-[var(--az-paper)] hover:text-[var(--az-navy)]">
										Soluções
									</a>
									<a
										href="#como-funciona"
										onClick={() => setMobileMenuOpen(false)}
										className="block rounded-lg p-4 text-lg font-semibold text-[var(--az-ink)] transition-colors hover:bg-[var(--az-paper)] hover:text-[var(--az-navy)]">
										Como funciona
									</a>
									<a
										href="#comecar"
										onClick={() => setMobileMenuOpen(false)}
										className="block rounded-lg p-4 text-lg font-semibold text-[var(--az-ink)] transition-colors hover:bg-[var(--az-paper)] hover:text-[var(--az-navy)]">
										Começar
									</a>
									<a
										href="#faq"
										onClick={() => setMobileMenuOpen(false)}
										className="block rounded-lg p-4 text-lg font-semibold text-[var(--az-ink)] transition-colors hover:bg-[var(--az-paper)] hover:text-[var(--az-navy)]">
										FAQ
									</a>
									<div className="my-3 h-px bg-[var(--az-line)]" />
									<button
										aria-label="Fazer login no ArenaSys"
										onClick={() => {
											setMobileMenuOpen(false);
											navigate("/login");
										}}
										className="w-full rounded-lg p-4 text-left text-base font-semibold text-[var(--az-ink)] transition-colors hover:bg-[var(--az-paper)]">
										Entrar
									</button>
									<button
										aria-label="Criar agenda online no ArenaSys"
										onClick={() => {
											setMobileMenuOpen(false);
											navigate("/login?mode=signup");
										}}
										className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[var(--az-navy)] text-lg font-semibold text-white shadow-sm">
										Criar agenda
										<ArrowRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
					</nav>
				</header>

				{/* --- HERO: Produto SaaS com prova visual imediata --- */}
				<section className="relative isolate overflow-hidden bg-[var(--az-navy)] px-5 pb-16 pt-36 text-white sm:pt-40 lg:pb-24 lg:pt-44">
					<div className="absolute inset-0 bg-[var(--az-navy)]" />
					<div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(22,50,79,0.98),rgba(47,107,69,0.86))]" />
					<div className="absolute left-[6%] top-32 hidden h-24 w-24 rounded-[2rem] border border-white/18 bg-white/10 rotate-12 lg:block" />
					<div className="absolute right-[12%] top-28 hidden h-28 w-28 rounded-full border border-white/18 bg-white/10 lg:block" />
					{/* Ambient glow behind mockups */}
					<div className="absolute right-[-5%] top-[30%] hidden h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(47,107,69,0.3)_0%,transparent_70%)] blur-3xl lg:block animate-pulse-glow" />
					<div className="absolute right-[15%] top-[50%] hidden h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)] blur-2xl lg:block animate-pulse-glow" style={{ animationDelay: "2s" }} />

					<div className="relative z-10 mx-auto max-w-7xl">
						<div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
							{/* Left: Text */}
							<div className="mx-auto max-w-2xl space-y-8 text-center lg:mx-0 lg:text-left">
								<div className="flex flex-wrap justify-center gap-2 lg:justify-start">
									<div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/14 px-5 py-2.5 text-sm font-black text-white shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
										<Sparkles className="h-4 w-4 text-amber-200" />
										<span style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>
											O sistema completo para reservas esportivas
										</span>
									</div>
								</div>

								<div className="space-y-5">
									<h1
										className="text-[2.75rem] font-semibold leading-[0.96] text-white sm:text-5xl lg:text-[4.1rem] xl:text-[4.6rem]"
										style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>
										A solução completa para vender horários.
									</h1>
									<p
										className="max-w-xl text-lg font-extrabold leading-8 text-blue-50 sm:text-xl lg:mx-0"
										style={{ color: "#eff6ff", WebkitTextFillColor: "#eff6ff" }}>
										Transforme sua agenda em um link de reservas, organize cada
										quadra por horário e acompanhe pagamentos, clientes e ocupação
										em um painel simples.
									</p>
								</div>

								<div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row lg:justify-start">
									<button
										onClick={startSignup}
										className="btn-shine relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-lg bg-[var(--az-surface)] px-8 text-base font-semibold text-[var(--az-navy)] shadow-[0_18px_38px_-20px_rgba(2,6,23,0.72)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--az-paper)] active:scale-[0.98] sm:w-auto sm:min-w-[292px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
										aria-label="Testar grátis agora - começar teste de 7 dias">
										Criar minha agenda online
										<ArrowRight className="h-5 w-5" />
									</button>
									<button
										onClick={() =>
											document
												.getElementById("como-funciona")
												?.scrollIntoView({ behavior: "smooth" })
										}
										className="flex h-14 w-full items-center justify-center whitespace-nowrap rounded-lg border border-white/45 bg-white/12 px-8 text-base font-semibold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/22 sm:w-auto sm:min-w-[210px]"
										aria-label="Ver como funciona o ArenaSys"
										style={{ color: "#fff", WebkitTextFillColor: "#fff" }}>
										Ver como funciona
									</button>
								</div>

								<div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold text-blue-50 lg:justify-start">
									{[
										"Link próprio para reservas",
										"Sem app para o cliente",
										"Pagamento no balcão ou combinado",
									].map((item) => (
										<div key={item} className="inline-flex items-center gap-2">
											<Check className="h-4 w-4 text-amber-200" />
											<span style={{ color: "#eff6ff", WebkitTextFillColor: "#eff6ff" }}>
												{item}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Right: Device mockups */}
							<div className="relative mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-none">
								{/* MacBook */}
								<div className="hero-mockup-laptop relative z-10" style={{ animation: "heroFloat 6s ease-in-out infinite", animationDelay: "0.3s" }}><div style={{ opacity: 0, animation: "heroMockupIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s forwards" }}><MacBookMockup><DashboardAppScreen /></MacBookMockup></div></div>

								{/* iPhone */}
								<div className="hero-mockup-phone absolute -bottom-8 -right-4 z-20 w-[35%] sm:-right-2 sm:w-[32%] lg:-bottom-12 lg:-right-6 lg:w-[35%]" style={{ animation: "heroFloat 6s ease-in-out infinite", animationDelay: "1.5s" }}><div style={{ opacity: 0, animation: "heroMockupIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s forwards" }}><IPhoneMockup><CalendarAppScreen /></IPhoneMockup></div></div>

								{/* Ambient reflection */}
								<div className="absolute -bottom-8 left-[10%] right-[10%] h-16 rounded-full bg-white/5 blur-2xl" />
							</div>
						</div>
					</div>
				</section>

				<OutcomeStrip />

				{/* --- SEÇÃO PROBLEMA: diagnostico da operacao --- */}
				<section className="relative bg-[var(--az-paper)] px-4 py-20">
					<div className="mx-auto max-w-6xl">
						<ScrollReveal className="mx-auto mb-14 max-w-3xl text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-clay)]">
								O custo invisivel da agenda manual
							</p>
							<h2 className="text-3xl font-semibold text-[var(--az-ink)] md:text-4xl lg:text-5xl">
								Enquanto a reserva depende de conversa, sua operação depende de
								memória.
							</h2>
							<p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[var(--az-ink-soft)]">
								O WhatsApp continua útil para relacionamento. O problema começa
								quando ele vira agenda, caixa, histórico e controle ao mesmo
								tempo.
							</p>
						</ScrollReveal>

						<div className="grid gap-5 lg:grid-cols-3">
							{[
								{
									icon: MessageSquare,
									label: "Atendimento preso no chat",
									pain: "A equipe responde a mesma pergunta de horário várias vezes por dia, mesmo quando a quadra está livre.",
									impact: "tempo perdido",
								},
								{
									icon: CalendarDays,
									label: "Agenda sem fonte única",
									pain: "Reservas ficam em mensagens, cadernos e lembranças. Basta uma troca de turno para o conflito aparecer.",
									impact: "risco de conflito",
								},
								{
									icon: CreditCard,
									label: "Receita difícil de enxergar",
									pain: "Sem um painel simples, fica mais difícil saber o que entrou, o que está pendente e quais horários vendem melhor.",
									impact: "visão fraca",
								},
							].map((item, i) => (
								<ScrollReveal key={item.label} delay={i * 100}>
									<TiltCard className="group h-full rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-7 shadow-[0_24px_70px_-48px_rgba(22,24,26,0.38)] transition-colors duration-300 hover:border-[var(--az-clay)]">
										<div className="mb-6 flex items-center justify-between gap-4">
											<div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)]">
												<item.icon className="h-7 w-7 text-[var(--az-clay)]" />
											</div>
											<span className="rounded-full border border-[var(--az-line)] bg-[var(--az-paper)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--az-clay)]">
												{item.impact}
											</span>
										</div>
										<h3 className="mb-3 text-xl font-semibold text-[var(--az-ink)]">
											{item.label}
										</h3>
										<p className="text-base leading-relaxed text-[var(--az-ink-soft)]">
											{item.pain}
										</p>
									</TiltCard>
								</ScrollReveal>
							))}
						</div>

						<ScrollReveal delay={250}>
							<div className="mt-8 rounded-lg border border-[var(--az-line)] bg-[var(--az-navy)] p-6 text-center shadow-[0_24px_70px_-48px_rgba(22,24,26,0.42)]">
								<p className="text-lg font-semibold leading-8 text-white">
									A solução não é abandonar o WhatsApp. É tirar a agenda de
									dentro dele.
								</p>
							</div>
						</ScrollReveal>
					</div>
				</section>

				<ProductSuiteSection onPrimaryAction={startSignup} />

				{/* --- COMO FUNCIONA: 3 passos com reveal --- */}
				<section id="como-funciona" className="relative bg-[var(--az-paper)] px-4 py-28">
					<div className="max-w-5xl mx-auto">
						<ScrollReveal className="text-center mb-16">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
								Da primeira quadra ao primeiro link
							</p>
							<h2 className="mb-4 text-3xl font-semibold text-[var(--az-ink)] md:text-5xl">
								Começa simples. Continua organizado.
							</h2>
							<p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--az-ink-soft)]">
								A ideia não é trocar toda a operação de uma vez. É colocar o
								fluxo principal de reservas em um lugar que a equipe consiga
								confiar.
							</p>
						</ScrollReveal>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									step: "1",
									title: "Configure a base",
									desc: "Cadastre quadras, horários, valores e regras principais da sua operação.",
								},
								{
									step: "2",
									title: "Envie o link",
									desc: "O cliente consulta disponibilidade e solicita a reserva sem esperar resposta manual.",
								},
								{
									step: "3",
									title: "Acompanhe no painel",
									desc: "Sua equipe confirma pagamentos, visualiza reservas e mantém a agenda atualizada.",
								},
							].map((item, i) => (
								<ScrollReveal key={item.step} delay={i * 150}>
									<TiltCard className="h-full rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-8 text-center shadow-[0_20px_70px_-55px_rgba(22,24,26,0.42)] transition-colors duration-300 hover:border-[var(--az-navy)]">
										<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--az-line)] bg-[var(--az-navy-soft)] text-3xl font-semibold text-[var(--az-navy)]">
											{item.step}
										</div>
										<h3 className="mb-3 text-xl font-semibold text-[var(--az-ink)]">
											{item.title}
										</h3>
										<p className="text-base leading-7 text-[var(--az-ink-soft)]">
											{item.desc}
										</p>
									</TiltCard>
								</ScrollReveal>
							))}
						</div>
					</div>
				</section>

				{/* --- PRÓXIMO PASSO: descoberta antes de preço --- */}
				<section
					id="comecar"
					className="landing-dark-section relative scroll-mt-24 overflow-hidden border-y border-white/10 bg-[var(--az-navy)] px-4 py-28 sm:py-32">
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
					<div className="absolute left-[8%] top-12 h-56 w-56 rounded-full bg-white/10 blur-[110px]" />
					<div className="absolute bottom-10 right-[12%] h-64 w-64 rounded-full bg-[var(--az-turf)]/20 blur-[130px]" />

					<div className="relative z-10 mx-auto max-w-6xl">
						<ScrollReveal className="mb-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
							<div>
								<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/72">
									Próximo passo
								</p>
								<h2 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
									Comece pela agenda piloto. Decida o resto com clareza.
								</h2>
							</div>
							<p className="max-w-2xl text-lg leading-8 text-white/72 lg:justify-self-end">
								A primeira conversa precisa mostrar valor real: uma agenda
								publicada, quadras configuradas e um caminho simples para o
								cliente reservar sem depender de troca de mensagens.
							</p>
						</ScrollReveal>

						<ScrollReveal delay={100}>
							<div className="mb-8 grid gap-4 md:grid-cols-3">
								{[
									{
										label: "Diagnóstico",
										title: "Ler a operação",
										desc: "Entender como chegam as reservas, quais quadras entram primeiro e onde a equipe perde tempo.",
									},
									{
										label: "Agenda piloto",
										title: "Publicar um link real",
										desc: "Colocar uma versão enxuta no ar para testar o fluxo com reservas da rotina da arena.",
									},
									{
										label: "Decisão",
										title: "Expandir com segurança",
										desc: "Depois da validação, ampliar quadras, regras e acompanhamento sem mudar tudo no escuro.",
									},
								].map((item) => (
									<div
										key={item.label}
										className="group h-full rounded-lg border border-white/12 bg-white/[0.06] p-6 transition-colors duration-300 hover:border-white/35">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/66">
											{item.label}
										</p>
										<p className="mt-4 text-2xl font-semibold text-white">
											{item.title}
										</p>
										<p className="mt-3 text-sm leading-6 text-white/70">
											{item.desc}
										</p>
									</div>
								))}
							</div>
						</ScrollReveal>

						<ScrollReveal delay={200}>
							<div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
								<div className="relative overflow-hidden rounded-lg bg-[var(--az-surface)] p-8 text-[var(--az-ink)] shadow-[0_30px_90px_-55px_rgba(15,23,42,0.9)] md:p-10">
									<div className="absolute right-0 top-0 h-40 w-40 translate-x-8 -translate-y-8 rounded-full bg-[var(--az-navy-soft)] blur-2xl" />
									<div className="relative">
										<p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--az-navy)]">
											Agenda piloto
										</p>
										<h3 className="max-w-xl text-3xl font-semibold leading-tight md:text-4xl">
											Publique uma experiência pequena, real e fácil de avaliar.
										</h3>
										<p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--az-ink-soft)]">
											O dono da arena não precisa comprar uma promessa. Ele precisa
											ver uma quadra funcionando no link, a equipe acompanhando no
											painel e o cliente entendendo como reservar.
										</p>
										<div className="mt-8 grid gap-4 sm:grid-cols-2">
											<div className="border-l-4 border-[var(--az-navy)] pl-4">
												<p className="text-sm font-semibold uppercase tracking-wide text-[var(--az-ink-soft)]">
													Entrada leve
												</p>
												<p className="mt-1 text-base font-semibold text-[var(--az-ink)]">
													7 dias grátis, sem cartão
												</p>
											</div>
											<div className="border-l-4 border-[var(--az-turf)] pl-4">
												<p className="text-sm font-semibold uppercase tracking-wide text-[var(--az-ink-soft)]">
													Acompanhamento
												</p>
												<p className="mt-1 text-base font-semibold text-[var(--az-ink)]">
													Primeira agenda assistida
												</p>
											</div>
										</div>
									</div>
								</div>

								<div className="rounded-lg border border-white/12 bg-white/[0.06] p-7 backdrop-blur-sm md:p-8">
									<p className="mb-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
										O que entra no piloto
									</p>
									<ul className="space-y-4">
										{[
											"Agenda online com quadras, horários e bloqueios",
											"Link público para o cliente consultar disponibilidade",
											"Painel para acompanhar reservas, receita e pendências",
											"Pagamento no balcão ou combinado no fluxo atual",
											"Implantação assistida para colocar a primeira arena no ar",
										].map((item) => (
											<li
												key={item}
												className="flex items-start gap-3 text-base font-semibold leading-6 text-white">
												<div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/12">
													<Check className="h-4 w-4 text-white" />
												</div>
												<span>{item}</span>
											</li>
										))}
									</ul>

									<button
										onClick={() => navigate("/login?mode=signup")}
										className="btn-shine relative mt-8 h-16 w-full overflow-hidden rounded-lg bg-[var(--az-surface)] text-lg font-semibold text-[var(--az-navy)] transition-all duration-300 hover:bg-[var(--az-paper)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--az-navy)]"
										aria-label="Criar minha agenda online - teste grátis de 7 dias">
										Criar minha agenda online
									</button>
								</div>
							</div>
						</ScrollReveal>
					</div>
				</section>

				{/* --- FAQ --- */}
				<section
					id="faq"
					className="relative scroll-mt-24 border-t border-[var(--az-line)] bg-[var(--az-paper)] px-4 py-28">
					<div className="max-w-3xl mx-auto">
						<ScrollReveal className="text-center mb-16">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
								Antes de testar
							</p>
							<h2 className="text-3xl font-semibold text-[var(--az-ink)] md:text-5xl">
								Respostas diretas para decidir sem enrolação.
							</h2>
						</ScrollReveal>

						<div className="space-y-4">
							{faqList.map((item, i) => (
								<ScrollReveal key={i} delay={i * 75}>
									<div className="rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-6 transition-colors duration-300 hover:border-[var(--az-navy)]">
										<h3 className="mb-2 text-lg font-semibold text-[var(--az-ink)]">
											{item.question}
										</h3>
										<p className="text-[var(--az-ink-soft)]">{item.answer}</p>
									</div>
								</ScrollReveal>
							))}
						</div>
					</div>
				</section>

				{/* --- CTA FINAL: Apple-style grand finale --- */}
				<section className="relative overflow-hidden bg-[var(--az-surface)] px-4 py-32">
					{/* Background drama */}
					<div className="absolute inset-0">
						<div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--az-navy-soft)] blur-[150px] animate-pulse-glow" />
					</div>

					<ScrollReveal>
						<div className="max-w-3xl mx-auto text-center relative z-10">
							<h2 className="mb-8 text-4xl font-semibold leading-tight text-[var(--az-ink)] md:text-5xl lg:text-6xl">
								Comece pela próxima reserva.
								<br />
								<span className="text-[var(--az-turf)]">
									Organize o resto a partir dela.
								</span>
							</h2>
							<p className="mx-auto mb-10 max-w-xl text-xl text-[var(--az-ink-soft)]">
								Teste por 7 dias sem cartão, coloque seu link no ar e veja se o
								fluxo encaixa na rotina da sua arena.
							</p>
							<button
								onClick={() => navigate("/login?mode=signup")}
								className="btn-shine relative inline-flex h-16 items-center gap-3 overflow-hidden rounded-lg bg-[var(--az-navy)] px-14 text-lg font-semibold text-white shadow-sm transition-all duration-300 hover:scale-[1.01] hover:bg-[#10283f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--az-surface)]"
								aria-label="Começar teste grátis do ArenaSys">
								Começar teste grátis <ArrowRight className="w-5 h-5" />
							</button>
						</div>
					</ScrollReveal>
				</section>

				<PremiumFooter />
			</main>
		</>
	);
}
