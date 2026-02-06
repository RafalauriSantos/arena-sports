import {
	useEffect,
	useState,
	useRef,
	useCallback,
	useMemo,
	lazy,
	Suspense,
} from "react";
import { useNavigate } from "react-router-dom";
import {
	Zap,
	ShieldCheck,
	Check,
	ArrowRight,
	Sparkles,
	MessageSquare,
	BookOpen,
	CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
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

// --- HOOK: ROTATING TEXT (Apple-style) ---
function useRotatingText(words: string[], interval: number = 3000) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		const timer = setInterval(() => {
			setIsAnimating(true);
			setTimeout(() => {
				setCurrentIndex((prev) => (prev + 1) % words.length);
				setIsAnimating(false);
			}, 300);
		}, interval);
		return () => clearInterval(timer);
	}, [words.length, interval]);

	return { word: words[currentIndex], isAnimating };
}

// --- HOOK: 3D TILT EFFECT ---
function useTilt(intensity: number = 15) {
	const ref = useRef<HTMLDivElement>(null);
	const [style, setStyle] = useState({
		transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)",
	});

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
		const element = ref.current;
		if (!element) return;
		element.addEventListener("mousemove", handleMouseMove);
		element.addEventListener("mouseleave", handleMouseLeave);
		return () => {
			element.removeEventListener("mousemove", handleMouseMove);
			element.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [handleMouseMove, handleMouseLeave]);

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
	const [ref, isInView] = useInView();
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
function useTypewriter(
	words: string[],
	typingSpeed = 100,
	deletingSpeed = 50,
	pauseDuration = 2000,
) {
	const [currentWordIndex, setCurrentWordIndex] = useState(0);
	const [currentText, setCurrentText] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);
	const [isPaused, setIsPaused] = useState(false);

	useEffect(() => {
		const currentWord = words[currentWordIndex];

		if (isPaused) {
			const pauseTimer = setTimeout(() => {
				setIsPaused(false);
				setIsDeleting(true);
			}, pauseDuration);
			return () => clearTimeout(pauseTimer);
		}

		if (isDeleting) {
			if (currentText === "") {
				setIsDeleting(false);
				setCurrentWordIndex((prev) => (prev + 1) % words.length);
			} else {
				const deleteTimer = setTimeout(() => {
					setCurrentText(currentText.slice(0, -1));
				}, deletingSpeed);
				return () => clearTimeout(deleteTimer);
			}
		} else {
			if (currentText === currentWord) {
				setIsPaused(true);
			} else {
				const typeTimer = setTimeout(() => {
					setCurrentText(currentWord.slice(0, currentText.length + 1));
				}, typingSpeed);
				return () => clearTimeout(typeTimer);
			}
		}
	}, [
		currentText,
		isDeleting,
		isPaused,
		currentWordIndex,
		words,
		typingSpeed,
		deletingSpeed,
		pauseDuration,
	]);

	return { text: currentText, isTyping: !isDeleting && !isPaused };
}

// --- COMPONENTE: HERO COM EFEITO TYPEWRITER ---
function RotatingHeroText() {
	const words = ["confusão.", "calote.", "bagunça.", "estresse."];
	const { text } = useTypewriter(words, 80, 40, 1800);

	return (
		<h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.0] text-white animate-in fade-in slide-in-from-bottom-8 duration-1000">
			Sua arena cheia.
			<br />
			<span className="text-emerald-400">
				Sem{" "}
				<span className="inline-block min-w-[200px] md:min-w-[320px] lg:min-w-[400px] text-left">
					{text}
					<span className="inline-block w-[3px] md:w-[4px] h-[0.9em] bg-emerald-400 ml-1 animate-blink align-middle" />
				</span>
			</span>
		</h1>
	);
}

// --- COMPONENTE: SOCIAL PROOF NUMBERS ---
function SocialProofBar() {
	return (
		<div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 py-8 px-4">
			{/* Trust Signals Reais */}
			<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
				<div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
					<Check className="w-3 h-3 text-emerald-500" />
				</div>
				<span className="text-sm text-gray-300">7 dias grátis</span>
			</div>

			<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
				<div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
					<Check className="w-3 h-3 text-emerald-500" />
				</div>
				<span className="text-sm text-gray-300">Sem cartão de crédito</span>
			</div>

			<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
				<div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
					<Check className="w-3 h-3 text-emerald-500" />
				</div>
				<span className="text-sm text-gray-300">Suporte via WhatsApp</span>
			</div>

			{/* Separador */}
			<div className="w-full md:w-auto flex justify-center">
				<div className="w-16 h-px md:w-px md:h-8 bg-white/10" />
			</div>

			{/* Estatísticas do Problema (reais do mercado) */}
			<div className="flex flex-wrap items-center justify-center gap-6 text-center">
				<div className="px-3">
					<p className="text-2xl md:text-3xl font-black text-red-400/80">78%</p>
					<p className="text-xs text-gray-300 max-w-[100px]">
						das arenas perdem reservas por conflitos
					</p>
				</div>
				<div className="px-3">
					<p className="text-2xl md:text-3xl font-black text-red-400/80">
						R$ 4.8k
					</p>
					<p className="text-xs text-gray-300 max-w-[100px]">
						perdidos/mês em média com no-shows
					</p>
				</div>
			</div>
		</div>
	);
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

// --- FAQ: linguagem simples ---
const faqList = [
	{
		question: "Quanto tempo leva pra configurar?",
		answer:
			"Menos de 15 minutos. Você cadastra as quadras, os preços, e seu link já está pronto pra mandar pro cliente.",
	},
	{
		question: "Preciso instalar algo?",
		answer:
			"Não. Tudo funciona no navegador — celular, tablet ou computador. Nada pra baixar.",
	},
	{
		question: "Como o cliente paga?",
		answer:
			"Você cobra como sempre fez: no balcão. O ArenaSys só organiza a agenda.",
	},
	{
		question: "Posso cancelar quando quiser?",
		answer:
			"Pode. Sem multa, sem burocracia. A gente confia que você vai gostar.",
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

// --- TELAS FAKE — ULTRA REALISTAS ---

// Tela do iPhone: App de Reservas do Cliente
function CalendarAppScreen() {
	const [selectedTime, setSelectedTime] = useState<string | null>("19:00");

	return (
		<div className="h-full bg-[#0a0a0a] font-sans flex flex-col overflow-hidden">
			{/* Header com Arena Info */}
			<div className="relative px-4 pt-2 pb-3 border-b border-white/5">
				<div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent" />
				<div className="relative flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
						<span className="text-lg">⚽</span>
					</div>
					<div className="flex-1">
						<h3 className="text-white font-bold text-[11px] leading-tight">
							Arena Gol de Placa
						</h3>
						<div className="flex items-center gap-1.5 mt-0.5">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
							<span className="text-emerald-400 text-[8px] font-medium">
								Aberto agora
							</span>
							<span className="text-gray-300 text-[8px]">• 4.9 ⭐</span>
						</div>
					</div>
					<div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
						<span className="text-[10px]">💬</span>
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
								"bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
							:	"bg-white/5 text-gray-300 border border-white/10"
						}`}>
						{q}
					</button>
				))}
			</div>

			{/* Calendário Mini */}
			<div className="px-3 py-2">
				<div className="flex items-center justify-between mb-2">
					<span className="text-[9px] text-gray-300 font-medium">
						Janeiro 2026
					</span>
					<div className="flex gap-1">
						<div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[8px] text-gray-300">
							←
						</div>
						<div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[8px] text-gray-300">
							→
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
								d.selected ? "bg-emerald-500 shadow-lg shadow-emerald-500/40"
								: d.available ? "bg-white/5 hover:bg-white/10"
								: "bg-white/[0.02] opacity-40"
							}`}>
							<span
								className={`text-[6px] font-medium ${d.selected ? "text-black/60" : "text-gray-300"}`}>
								{d.day}
							</span>
							<span
								className={`text-[11px] font-bold ${d.selected ? "text-black" : "text-white"}`}>
								{d.date}
							</span>
							{!d.available && (
								<span className="text-[5px] text-red-400">Lotado</span>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Horários Disponíveis */}
			<div className="flex-1 px-3 overflow-hidden">
				<span className="text-[8px] text-gray-300 font-medium uppercase tracking-wider">
					Horários disponíveis
				</span>
				<div className="mt-2 space-y-1.5 overflow-y-auto max-h-[140px] hide-scrollbar">
					{[
						{ time: "18:00", price: "R$ 120", status: "available" },
						{ time: "19:00", price: "R$ 120", status: "selected" },
						{
							time: "20:00",
							price: "R$ 150",
							status: "available",
							tag: "🔥 Último",
						},
						{
							time: "21:00",
							price: "R$ 150",
							status: "occupied",
							occupant: "João M.",
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
									"bg-emerald-500/20 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
								: slot.status === "occupied" ?
									"bg-white/[0.02] border border-white/5 opacity-50"
								:	"bg-white/5 border border-white/5 hover:border-white/20"
							}`}>
							<div className="flex items-center gap-2">
								<div
									className={`w-7 h-7 rounded-lg flex items-center justify-center ${
										slot.status === "selected" || selectedTime === slot.time ?
											"bg-emerald-500 text-black"
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
											`Reservado • ${slot.occupant}`
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
											"text-emerald-400"
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
			<div className="p-3 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur">
				<button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-bold text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform">
					Confirmar Reserva • R$ 120
					<span className="text-[10px]">→</span>
				</button>
			</div>
		</div>
	);
}

// Tela do MacBook: Dashboard Admin
function DashboardAppScreen() {
	return (
		<div className="h-full bg-[#050507] font-sans relative overflow-hidden flex">
			{/* Sidebar Mini */}
			<div className="w-12 md:w-14 bg-[#0a0a0a] border-r border-white/5 flex flex-col items-center py-3 gap-3">
				<div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
					<Zap className="w-3 h-3 md:w-4 md:h-4 text-black" />
				</div>
				<div className="w-6 h-[1px] bg-white/10 my-1" />
				{[
					{ icon: "📊", active: true },
					{ icon: "📅", active: false },
					{ icon: "👥", active: false },
					{ icon: "💰", active: false },
					{ icon: "⚙️", active: false },
				].map((item, i) => (
					<div
						key={i}
						className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] transition-all cursor-pointer ${
							item.active ?
								"bg-emerald-500/20 shadow-lg shadow-emerald-500/10"
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
						<span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] font-bold border border-emerald-500/30">
							Tempo real
						</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="relative">
							<div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px]">
								🔔
							</div>
							<div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						</div>
						<div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-[8px] font-bold text-black">
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
								icon: "💰",
							},
							{
								label: "Reservas",
								value: "23",
								change: "+5",
								up: true,
								icon: "📅",
							},
							{
								label: "Ocupação",
								value: "87%",
								change: "+12%",
								up: true,
								icon: "📈",
							},
							{
								label: "Cancelamentos",
								value: "2",
								change: "-3",
								up: false,
								icon: "❌",
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
									className={`text-[7px] md:text-[8px] font-bold ${kpi.up ? "text-emerald-400" : "text-red-400"}`}>
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
													"bg-emerald-500/20 text-emerald-400"
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
													"bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30"
												:	"bg-gradient-to-t from-white/10 to-white/20"
											}`}
											style={{ height: `${h}%` }}
										/>
										<span className="text-[6px] text-gray-600">
											{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Próximas Reservas */}
						<div className="col-span-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
							<span className="text-[9px] text-gray-300 font-medium block mb-2">
								Próximas Reservas
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
													"bg-emerald-500"
												:	"bg-yellow-500"
											}`}
										/>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1">
												<span className="text-white font-bold text-[9px]">
													{res.time}
												</span>
												<span className="text-gray-600 text-[7px]">•</span>
												<span className="text-gray-300 text-[8px] truncate">
													{res.client}
												</span>
											</div>
											<span className="text-gray-600 text-[7px]">
												{res.court}
											</span>
										</div>
										<div
											className={`px-1.5 py-0.5 rounded text-[6px] font-bold ${
												res.status === "confirmed" ?
													"bg-emerald-500/20 text-emerald-400"
												:	"bg-yellow-500/20 text-yellow-400"
											}`}>
											{res.status === "confirmed" ? "✓" : "⏳"}
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

// --- PÁGINA PRINCIPAL ---

export default function LandingPage() {
	const navigate = useNavigate();
	const visibleElements = useScrollAnimation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [foundersProgress, setFoundersProgress] = useState<{
		cap: number;
		sold: number;
		remaining: number;
	} | null>(null);

	const isVisible = (id: string) => visibleElements.has(id);

	useEffect(() => {
		let mounted = true;
		(async () => {
			const { data, error } = await supabase.rpc("get_founders_progress");
			if (!mounted) return;
			if (error || !data) {
				setFoundersProgress(null);
				return;
			}
			const row = (Array.isArray(data) ? data[0] : data) as
				| { cap?: number; sold?: number; remaining?: number }
				| undefined;
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
				title="Sistema de gestão e agendamento de quadras esportivas | ArenaSys"
				description="Evite conflitos de horários, perca menos dinheiro e organize sua arena em um só lugar. Software para quadras esportivas, controle de horários e sistema para aluguel de quadras. Teste grátis 7 dias."
				keywords="sistema para gestão de quadras esportivas, sistema de agendamento de quadras, software para quadras esportivas, sistema para arenas esportivas, controle de horários de quadras, sistema para aluguel de quadras, gestão de arena esportiva"
				canonical="/"
			/>
			<main
				role="main"
				id="main-content"
				data-seo-ready
				className="relative min-h-dvh text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden scroll-smooth">
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
          background: linear-gradient(90deg, #fff 0%, #fff 40%, #10b981 50%, #fff 60%, #fff 100%);
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
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          transition: all 0.3s ease;
          transform: translateX(-50%);
        }
        .nav-link:hover::before {
          width: 100%;
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
					<div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/8 rounded-full blur-[120px] animate-pulse-glow" />
					<div
						className="absolute top-[60%] -right-[200px] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse-glow"
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
				<header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
					{/* Outer glow layer */}
					<div className="absolute inset-0 flex justify-center pt-4 px-4 pointer-events-none">
						<div className="w-full max-w-4xl h-12 rounded-full bg-emerald-500/5 blur-xl" />
					</div>

					<nav className="relative flex items-center justify-between w-full max-w-4xl h-14 rounded-full">
						{/* Animated gradient border */}
						<div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/50 via-cyan-500/50 to-emerald-500/50 animate-gradient opacity-60" />
						<div className="absolute inset-[1px] rounded-full bg-[#0a0a0a]/95 backdrop-blur-2xl" />

						{/* Inner content */}
						<div className="relative z-10 flex items-center justify-between w-full px-4">
							{/* Logo com órbitas */}
							<div
								className="flex items-center gap-3 cursor-pointer group"
								onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
								<div className="relative flex items-center justify-center w-9 h-9">
									{/* Orbiting particles */}
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-orbit" />
										<div className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-orbit-reverse opacity-60" />
									</div>
									{/* Core logo */}
									<div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow duration-300">
										<Zap className="w-4 h-4 text-black" />
									</div>
								</div>
								<span className="font-black text-base tracking-tight hidden sm:inline animate-text-shimmer">
									ArenaSys
								</span>
							</div>

							{/* Navigation links com efeito especial */}
							<div className="hidden md:flex items-center gap-1">
								<a
									href="#pricing"
									className="nav-link px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300">
									Preço
								</a>
								<a
									href="#faq"
									className="nav-link px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300">
									FAQ
								</a>
							</div>

							{/* CTAs */}
							<div className="hidden md:flex items-center gap-3">
								<button
									onClick={() => navigate("/login")}
									className="text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 px-3 py-2 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]">
									Login
								</button>
								<button
									onClick={() => navigate("/login?mode=signup")}
									className="relative h-10 px-5 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 text-black overflow-hidden group magnetic-btn shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"
									aria-label="Começar teste grátis de 7 dias do ArenaSys">
									<span className="relative z-10 flex items-center gap-1">
										Testar grátis
										<Sparkles className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
									</span>
									<div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								</button>
							</div>

							{/* Mobile menu button */}
							<button
								className="md:hidden relative p-2 text-gray-300 hover:text-white transition-colors"
								aria-label="Abrir menu de navegação"
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
								<div
									className={`w-5 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-[3px]" : ""}`}
								/>
								<div
									className={`w-5 h-0.5 bg-current mt-1.5 transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""}`}
								/>
							</button>
						</div>

						{/* Mobile menu */}
						{mobileMenuOpen && (
							<div className="absolute top-full left-0 right-0 mt-3 mx-2 overflow-hidden rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300 md:hidden z-[100]">
								<div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent opacity-50" />
								<div className="relative p-5 bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50">
									<a
										href="#pricing"
										onClick={() => setMobileMenuOpen(false)}
										className="block p-4 hover:bg-white/5 rounded-2xl text-gray-300 text-lg font-medium transition-colors">
										Preço
									</a>
									<a
										href="#faq"
										onClick={() => setMobileMenuOpen(false)}
										className="block p-4 hover:bg-white/5 rounded-2xl text-gray-300 text-lg font-medium transition-colors">
										FAQ
									</a>
									<div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-3" />
									<button
										onClick={() => {
											setMobileMenuOpen(false);
											navigate("/login");
										}}
										className="w-full p-4 hover:bg-white/5 rounded-2xl text-gray-300 text-base text-left transition-colors">
										Login
									</button>
									<button
										onClick={() => {
											setMobileMenuOpen(false);
											navigate("/login?mode=signup");
										}}
										className="w-full mt-2 h-14 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
										Testar grátis
										<Sparkles className="w-4 h-4" />
									</button>
								</div>
							</div>
						)}
					</nav>
				</header>

				{/* --- HERO: Apple-style com texto rotativo --- */}
				<section className="relative pt-32 pb-24 lg:pt-44 lg:pb-32 px-4 overflow-hidden flex flex-col items-center">
					{/* Floating sparkles */}
					<div
						className="absolute top-40 left-[15%] w-2 h-2 bg-emerald-500/40 rounded-full animate-float"
						style={{ animationDelay: "0s" }}
					/>
					<div
						className="absolute top-60 right-[20%] w-1.5 h-1.5 bg-emerald-400/30 rounded-full animate-float"
						style={{ animationDelay: "1s" }}
					/>
					<div
						className="absolute bottom-40 left-[25%] w-1 h-1 bg-cyan-400/30 rounded-full animate-float"
						style={{ animationDelay: "2s" }}
					/>

					<div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
						{/* Badge */}
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
							<Sparkles className="w-4 h-4 text-emerald-400" />
							<span className="text-sm text-gray-300">
								Sistema #1 para arenas esportivas
							</span>
						</div>

						<RotatingHeroText />

						<p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 font-light">
							O cliente reserva pelo link. Você confirma e cobra no balcão.
							<br className="hidden md:block" />
							<span className="text-white font-medium">
								Acabou a bagunça no WhatsApp.
							</span>
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
							<button
								onClick={() => navigate("/login?mode=signup")}
								className="relative overflow-hidden h-16 px-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg shadow-[0_0_50px_-10px_rgba(16,185,129,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.7)] active:scale-95 w-full sm:w-auto animate-border-glow btn-shine flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"
								aria-label="Testar grátis agora - começar teste de 7 dias">
								Testar grátis agora
								<ArrowRight className="w-5 h-5" />
							</button>
						</div>

						<div className="flex items-center justify-center gap-6 pt-2 animate-in fade-in duration-1000 delay-500">
							<span className="flex items-center gap-2 text-sm text-gray-300">
								<Check className="w-4 h-4 text-emerald-500/70" /> 7 dias grátis
							</span>
							<span className="flex items-center gap-2 text-sm text-gray-300">
								<Check className="w-4 h-4 text-emerald-500/70" /> Sem cartão
							</span>
							<span className="flex items-center gap-2 text-sm text-gray-300">
								<Check className="w-4 h-4 text-emerald-500/70" /> Cancele quando
								quiser
							</span>
						</div>
					</div>

					{/* Social Proof Numbers */}
					<div className="mt-16 border-t border-white/5 pt-8">
						<SocialProofBar />
					</div>
				</section>

				{/* --- SEÇÃO PROBLEMA: com cards 3D tilt --- */}
				<section className="relative py-28 px-4">
					<div className="max-w-5xl mx-auto">
						<ScrollReveal className="text-center mb-16">
							<p className="text-red-400/80 text-sm font-bold uppercase tracking-widest mb-3">
								Parece familiar?
							</p>
							<h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white">
								O caos de todo dono de quadra
							</h2>
						</ScrollReveal>

						<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{[
								{
									icon: MessageSquare,
									enemy: "WhatsApp",
									pain: '"Tem horário amanhã às 19h?" — 47 mensagens por dia',
								},
								{
									icon: BookOpen,
									enemy: "Caderno",
									pain: '"Anota aí que eu vejo depois" — e some uma reserva',
								},
								{
									icon: CreditCard,
									enemy: "Calote",
									pain: '"Ele sempre paga" — mas não pagou e você ficou no prejuízo',
								},
							].map((item, i) => (
								<ScrollReveal key={i} delay={i * 100}>
									<TiltCard className="h-full p-8 rounded-3xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-colors duration-300">
										<div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
											<item.icon className="w-7 h-7 text-red-400" />
										</div>
										<h3 className="text-white font-bold text-xl mb-3">
											{item.enemy}
										</h3>
										<p className="text-gray-300 text-base leading-relaxed">
											{item.pain}
										</p>
									</TiltCard>
								</ScrollReveal>
							))}
						</div>
					</div>
				</section>

				{/* --- SEÇÃO SOLUÇÃO: com parallax mockups --- */}
				<section
					id="solucao"
					className="relative py-32 px-4 border-y border-white/5 bg-gradient-to-b from-[#050507] via-emerald-500/5 to-[#050507] overflow-hidden">
					<div className="max-w-5xl mx-auto">
						<ScrollReveal className="text-center mb-16">
							<p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-4">
								A solução
							</p>
							<h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6">
								Uma agenda que funciona sozinha
							</h2>
							<p className="text-gray-300 text-xl max-w-2xl mx-auto">
								Você para de apagar incêndio. O sistema organiza tudo.
							</p>
						</ScrollReveal>

						<div className="grid sm:grid-cols-2 gap-4 mb-20">
							{[
								{
									before: "WhatsApp o dia todo",
									after: "Cliente reserva pelo link",
								},
								{
									before: "Planilha ou na cabeça",
									after: "Uma agenda centralizada",
								},
								{
									before: "Não sabe quanto faturou",
									after: "Relatório financeiro pronto",
								},
								{
									before: "Conflito de horários",
									after: "Impossível marcar 2 no mesmo slot",
								},
							].map((item, i) => (
								<ScrollReveal key={i} delay={i * 75}>
									<div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 flex items-center gap-4 transition-all duration-300 hover:bg-white/[0.06]">
										<div className="flex-1">
											<p className="text-red-400/70 text-sm line-through mb-2">
												{item.before}
											</p>
											<p className="text-emerald-400 font-semibold text-lg">
												{item.after}
											</p>
										</div>
										<div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
											<Check className="w-5 h-5 text-emerald-500" />
										</div>
									</div>
								</ScrollReveal>
							))}
						</div>

						{/* Mockups com parallax */}
						<ScrollReveal>
							<div className="relative w-full max-w-4xl mx-auto">
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-emerald-500/15 rounded-full blur-[100px] animate-pulse-glow" />
								<div className="relative flex flex-col items-center md:flex-row md:items-end md:justify-center gap-4 md:gap-0">
									<div
										className="relative z-10 shadow-2xl animate-float"
										style={{ animationDelay: "0s" }}>
										<MacBookMockup>
											<DashboardAppScreen />
										</MacBookMockup>
									</div>
									<div
										className="relative z-20 transform scale-[0.7] md:scale-[0.8] md:ml-[-56px] lg:ml-[-72px] md:mb-6 animate-float"
										style={{ animationDelay: "1s" }}>
										<IPhoneMockup>
											<CalendarAppScreen />
										</IPhoneMockup>
									</div>
								</div>
							</div>
						</ScrollReveal>
					</div>
				</section>

				{/* --- COMO FUNCIONA: 3 passos com reveal --- */}
				<section className="relative py-32 px-4">
					<div className="max-w-5xl mx-auto">
						<ScrollReveal className="text-center mb-16">
							<h2 className="text-3xl md:text-5xl font-black text-white mb-4">
								Funciona em 3 passos
							</h2>
						</ScrollReveal>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									step: "1",
									title: "Cadastre sua arena",
									desc: "Quadras, horários e preços. 15 minutos.",
								},
								{
									step: "2",
									title: "Mande o link",
									desc: "Cliente vê disponibilidade e reserva sozinho.",
								},
								{
									step: "3",
									title: "Receba e confirme",
									desc: "Você cobra no balcão, como sempre fez.",
								},
							].map((item, i) => (
								<ScrollReveal key={item.step} delay={i * 150}>
									<TiltCard className="text-center p-8 rounded-3xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 transition-colors duration-300">
										<div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-400 font-black text-3xl border border-emerald-500/30">
											{item.step}
										</div>
										<h3 className="text-white font-bold text-xl mb-3">
											{item.title}
										</h3>
										<p className="text-gray-300 text-base">{item.desc}</p>
									</TiltCard>
								</ScrollReveal>
							))}
						</div>
					</div>
				</section>

				{/* --- SEÇÃO PREÇO: com glow e animações --- */}
				<section
					id="pricing"
					className="relative py-32 px-4 border-y border-white/5 overflow-hidden">
					{/* Background glow */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse-glow" />

					<div className="max-w-4xl mx-auto relative z-10">
						<ScrollReveal className="text-center mb-16">
							<h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6">
								Custa menos que 1 hora da sua quadra
							</h2>
							<p className="text-gray-300 text-xl max-w-2xl mx-auto">
								Com apenas uma reserva no mês, o sistema já se paga. O resto é
								lucro.
							</p>
						</ScrollReveal>

						<ScrollReveal delay={100}>
							<div className="grid sm:grid-cols-2 gap-6 mb-10">
								<div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-center">
									<p className="text-gray-300 text-sm uppercase tracking-wider mb-3">
										1 hora de aluguel
									</p>
									<p className="text-4xl font-black text-white">~R$ 200</p>
								</div>
								<div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-border-glow">
									<p className="text-emerald-400 text-sm uppercase tracking-wider mb-3">
										ArenaSys / mês
									</p>
									<p className="text-4xl font-black text-emerald-400">R$ 97</p>
								</div>
							</div>
						</ScrollReveal>

						<ScrollReveal delay={200}>
							<TiltCard className="relative rounded-3xl p-10 pt-14 md:pt-10 bg-black/40 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 transition-colors duration-300">
								{foundersProgress && foundersProgress.remaining > 0 && (
									<div className="absolute -top-4 md:-top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs md:text-sm font-bold px-4 md:px-6 py-2 rounded-full shadow-lg shadow-emerald-500/30 whitespace-nowrap z-10">
										🎉 FOUNDERS: Preço travado pra sempre
									</div>
								)}

								<div className="text-center mb-8">
									{/* Toggle Mensal/Anual visual */}
									<div className="flex items-center justify-center gap-3 mb-6">
										<span className="text-gray-300 text-sm">Mensal</span>
										<div className="relative w-14 h-7 bg-emerald-500/20 rounded-full border border-emerald-500/30">
											<div className="absolute right-1 top-1 w-5 h-5 bg-emerald-500 rounded-full shadow-lg" />
										</div>
										<span className="text-emerald-400 text-sm font-bold">
											Anual
										</span>
									</div>

									{foundersProgress && foundersProgress.remaining > 0 ?
										<>
											{/* Preço Founders Anual */}
											<div className="flex items-baseline justify-center gap-2 mb-3">
												<span className="text-2xl text-gray-300 line-through">
													R$ 97
												</span>
												<span className="text-6xl font-black text-emerald-400">
													R$ 67
												</span>
												<span className="text-gray-300 text-xl">/mês</span>
											</div>
											<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
												<span className="text-emerald-400 text-sm font-bold">
													30% OFF
												</span>
												<span className="text-gray-300 text-sm">
													• Plano anual • Preço fixo pra sempre
												</span>
											</div>
											<p className="text-gray-300 text-sm">
												Apenas{" "}
												<span className="text-white font-bold">
													{foundersProgress.remaining} vagas
												</span>{" "}
												com esse preço travado
											</p>
										</>
									:	<>
											{/* Preço normal */}
											<div className="flex items-baseline justify-center gap-2 mb-2">
												<span className="text-6xl font-black text-white">
													R$ 97
												</span>
												<span className="text-gray-300 text-xl">/mês</span>
											</div>
											<p className="text-gray-300">
												Plano mensal • Cancele quando quiser
											</p>
										</>
									}
								</div>

								{/* Comparativo de economia */}
								{foundersProgress && foundersProgress.remaining > 0 && (
									<div className="grid grid-cols-2 gap-3 mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
										<div className="text-center">
											<p className="text-gray-300 text-xs uppercase tracking-wider mb-1">
												Mensal
											</p>
											<p className="text-white font-bold">R$ 97/mês</p>
											<p className="text-gray-600 text-xs">= R$ 1.164/ano</p>
										</div>
										<div className="text-center border-l border-white/10">
											<p className="text-emerald-400 text-xs uppercase tracking-wider mb-1">
												Anual Founders
											</p>
											<p className="text-emerald-400 font-bold">R$ 67/mês</p>
											<p className="text-emerald-400/60 text-xs">
												= R$ 804/ano (economia de R$ 360)
											</p>
										</div>
									</div>
								)}

								<ul className="space-y-4 mb-8">
									{[
										"Agenda organizada — acabou conflito de horário",
										"Cliente reserva pelo link, 24h por dia",
										"Relatório financeiro — veja quanto faturou",
										"Mensalistas controlados",
										"Suporte no WhatsApp — gente de verdade",
									].map((item, i) => (
										<li
											key={i}
											className="flex items-center gap-3 text-white text-lg">
											<div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
												<Check className="w-4 h-4 text-emerald-500" />
											</div>
											<span>{item}</span>
										</li>
									))}
								</ul>

								<button
									onClick={() => navigate("/login?mode=signup")}
									className="relative overflow-hidden w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] btn-shine focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"
									aria-label="Começar teste grátis de 7 dias - plano Founders">
									Começar teste grátis
								</button>

								{foundersProgress && (
									<div className="mt-6">
										<div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
											<div
												className="h-full bg-emerald-500 transition-all duration-500"
												style={{
													width: `${Math.min(100, (foundersProgress.sold / foundersProgress.cap) * 100)}%`,
												}}
											/>
										</div>
										<p className="text-center text-sm text-gray-300 mt-3">
											{foundersProgress.remaining} de {foundersProgress.cap}{" "}
											vagas Founders restantes
										</p>
									</div>
								)}
							</TiltCard>
						</ScrollReveal>
					</div>
				</section>

				{/* --- SEÇÃO RISCO ZERO --- */}
				<section className="relative py-24 px-4">
					<ScrollReveal>
						<div className="max-w-4xl mx-auto">
							<div className="p-12 rounded-3xl bg-black/30 backdrop-blur-md border border-white/10 text-center">
								<div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
									<ShieldCheck className="w-10 h-10 text-emerald-500" />
								</div>
								<h3 className="text-3xl md:text-4xl font-black text-white mb-6">
									Risco zero pra você
								</h3>
								<div className="flex flex-wrap justify-center gap-4 text-gray-300">
									<span className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full text-base border border-white/10 hover:border-emerald-500/30 transition-colors">
										<Check className="w-5 h-5 text-emerald-500" /> Sem cartão de
										crédito
									</span>
									<span className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full text-base border border-white/10 hover:border-emerald-500/30 transition-colors">
										<Check className="w-5 h-5 text-emerald-500" /> Cancele
										quando quiser
									</span>
									<span className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full text-base border border-white/10 hover:border-emerald-500/30 transition-colors">
										<Check className="w-5 h-5 text-emerald-500" /> 7 dias grátis
									</span>
								</div>
							</div>
						</div>
					</ScrollReveal>
				</section>

				{/* --- FAQ --- */}
				<section
					id="faq"
					className="relative py-28 px-4 border-t border-white/5">
					<div className="max-w-3xl mx-auto">
						<ScrollReveal className="text-center mb-16">
							<h2 className="text-3xl md:text-5xl font-black text-white">
								Dúvidas rápidas
							</h2>
						</ScrollReveal>

						<div className="space-y-4">
							{faqList.map((item, i) => (
								<ScrollReveal key={i} delay={i * 75}>
									<div className="p-6 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 transition-colors duration-300">
										<h3 className="text-white font-bold text-lg mb-2">
											{item.question}
										</h3>
										<p className="text-gray-300">{item.answer}</p>
									</div>
								</ScrollReveal>
							))}
						</div>
					</div>
				</section>

				{/* --- CTA FINAL: Apple-style grand finale --- */}
				<section className="relative py-32 px-4 overflow-hidden">
					{/* Background drama */}
					<div className="absolute inset-0">
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse-glow" />
					</div>

					<ScrollReveal>
						<div className="max-w-3xl mx-auto text-center relative z-10">
							<h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-8 leading-tight">
								Sua quadra merece uma agenda
								<br />
								<span className="text-emerald-400">que funcione.</span>
							</h2>
							<p className="text-gray-300 text-xl mb-10 max-w-xl mx-auto">
								7 dias grátis. Sem cartão. Cancele quando quiser.
							</p>
							<button
								onClick={() => navigate("/login?mode=signup")}
								className="relative overflow-hidden h-16 px-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg shadow-[0_0_60px_-10px_rgba(16,185,129,0.6)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_80px_-10px_rgba(16,185,129,0.8)] active:scale-95 animate-border-glow btn-shine inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"
								aria-label="Organizar minha arena agora - começar teste grátis">
								Organizar minha arena agora <ArrowRight className="w-5 h-5" />
							</button>
						</div>
					</ScrollReveal>
				</section>

				<PremiumFooter />
			</main>
		</>
	);
}
