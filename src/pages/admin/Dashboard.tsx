import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AgendaMaster from "./AgendaMaster";
import FinanceiroView from "./FinanceiroView";
import ConfiguracoesView from "./ConfiguracoesView";
import FolgasView from "./FolgasView";
import MensalistasView from "./MensalistasView";
import {
	Home,
	Calendar,
	BarChart,
	Settings,
	Trophy,
	TrendingUp,
	Clock,
	Activity,
	Menu,
	LogOut,
	X,
	User,
	ChevronLeft,
	ChevronRight,
	Lock,
	Loader2,
	Sparkles,
	CheckCircle2,
	Headphones,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	Tooltip as RechartsTooltip,
	CartesianGrid,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/contexts/BookingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { supabase } from "@/lib/supabaseClient";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { AnimatedNumber } from "@/hooks/useCountUp";
import {
	SetupChecklistSidebar,
	useSetupProgress,
} from "@/components/admin/SetupChecklistSidebar";
import { TrialBanner } from "@/components/admin/TrialBanner";
import { TrialCountdown } from "@/components/admin/TrialCountdown";
import { SupportModal } from "@/components/admin/SupportModal";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DashboardSkeleton = () => (
	<div className="w-full flex bg-surface-0">
		{/* Sidebar Skeleton */}
		<div className="hidden md:flex w-72 flex-col gap-4 p-4 border-r border-white/10 shrink-0">
			<div className="h-20 w-full bg-white/5 animate-pulse rounded-xl" />
			<div className="space-y-3 pt-6">
				{[1, 2, 3, 4, 5].map((i) => (
					<div
						key={i}
						className="h-12 w-full bg-white/5 animate-pulse rounded-xl"
					/>
				))}
			</div>
		</div>
		{/* Content Skeleton */}
		<div className="flex-1 p-4 md:p-8 space-y-6 overflow-hidden">
			<div className="h-32 w-full bg-white/5 animate-pulse rounded-2xl" />
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="h-32 bg-white/5 animate-pulse rounded-2xl" />
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 h-96 bg-white/5 animate-pulse rounded-2xl" />
				<div className="h-96 bg-white/5 animate-pulse rounded-2xl" />
			</div>
		</div>
	</div>
);

// --- HELPERS (Formatadores) ---
const formatCurrency = (value: number) =>
	value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
	if (!isRecord(value)) return undefined;
	const v = value[key];
	return typeof v === "string" ? v : undefined;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatLocalDate = (date: Date) =>
	`${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatDateShort = (dateStr: string) => {
	// Parse a data no formato YYYY-MM-DD corretamente (timezone local)
	// Usa Date.UTC para evitar problemas de timezone, depois converte para local
	const [year, month, day] = dateStr.split("-").map(Number);

	// Cria a data no timezone local explicitamente
	const date = new Date(year, month - 1, day, 12, 0, 0, 0); // Usa meio-dia para evitar problemas de DST

	// Retorna o dia da semana abreviado (seg, ter, qua, etc)
	const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
	const dayOfWeek = date.getDay();
	return weekdays[dayOfWeek];
};

// Retorna os dias da semana atual (segunda a domingo)
const getCurrentWeekDays = () => {
	const now = new Date();
	const day = now.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

	// Calcula quantos dias atrás está a segunda-feira
	// Se hoje é domingo (0), segunda foi há 6 dias
	// Se hoje é segunda (1), segunda é hoje (0 dias)
	// Se hoje é terça (2), segunda foi há 1 dia
	const daysFromMonday = day === 0 ? 6 : day - 1;

	// Cria uma nova data para segunda-feira (não modifica o objeto original)
	const mondayDate = now.getDate() - daysFromMonday;
	const monday = new Date(
		now.getFullYear(),
		now.getMonth(),
		mondayDate,
		0,
		0,
		0,
		0,
	);

	const days = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(
			monday.getFullYear(),
			monday.getMonth(),
			monday.getDate() + i,
			0,
			0,
			0,
			0,
		);
		days.push(formatLocalDate(d));
	}
	return days;
};

// --- COMPONENTE: SIDEBAR PROFISSIONAL (A "Alma" do Layout) ---
type SidebarFixedProps = {
	mobileOpen: boolean;
	setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
	collapsed: boolean;
	setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
	activeView: string;
	setActiveView: React.Dispatch<React.SetStateAction<string>>;
	tenantId: string;
};

const SidebarFixed = ({
	mobileOpen,
	setMobileOpen,
	collapsed,
	setCollapsed,
	activeView,
	setActiveView,
	tenantId,
}: SidebarFixedProps) => {
	const { userProfile, signOut } = useAuth();
	const { toast } = useToast();
	const [checklistOpen, setChecklistOpen] = useState(false);
	const [supportModalOpen, setSupportModalOpen] = useState(false);

	const menuItems = [
		{ id: "dashboard", icon: Home, label: "Visão Geral" },
		{ id: "agenda", icon: Calendar, label: "Reservas" },
		{ id: "financeiro", icon: BarChart, label: "Financeiro" },
		{ id: "mensalistas", icon: Trophy, label: "Mensalistas" },
		{ id: "folgas", icon: Clock, label: "Gerenciar Folgas" },
	];

	// Hook para progresso do checklist
	const { completed, total, isComplete } = useSetupProgress(
		tenantId,
		userProfile,
	);

	return (
		<>
			<aside
				className={cn(
					"fixed top-0 left-0 z-50 h-full bg-surface-1/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-out shadow-2xl flex flex-col",
					mobileOpen ? "translate-x-0 w-72" : (
						"-translate-x-full md:translate-x-0"
					),
					collapsed ? "md:w-20" : "md:w-72",
				)}>
				<div
					className={cn(
						"flex items-center h-20 border-b border-white/5",
						collapsed ? "justify-center px-0" : "justify-between px-6",
					)}>
					{!collapsed && (
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
								<Activity className="text-emerald-400 h-5 w-5" />
							</div>
							<div>
								<h1 className="text-base font-bold text-white leading-none tracking-tight">
									ArenaSys
								</h1>
								<p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold mt-1">
									Gestão Pro
								</p>
							</div>
						</div>
					)}
					{collapsed && <Activity className="text-emerald-400 h-6 w-6" />}

					<button
						onClick={() => setCollapsed(!collapsed)}
						className="hidden md:flex text-gray-300 hover:text-white transition-colors p-1"
						title={collapsed ? "Expandir" : "Recolher"}>
						{collapsed ?
							<ChevronRight className="h-5 w-5" />
						:	<ChevronLeft className="h-5 w-5" />}
					</button>
					<button
						onClick={() => setMobileOpen(false)}
						className="md:hidden text-gray-300">
						<X className="h-6 w-6" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
					{/* Trial Countdown */}
					<TrialCountdown tenantId={tenantId} collapsed={collapsed} />

					{/* Botão do Checklist - Sempre visível */}
					<button
						onClick={() => setChecklistOpen(true)}
						className={cn(
							"w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 border mb-3 group relative overflow-hidden",
							collapsed ? "justify-center px-0" : "",
							isComplete ?
								"bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30 hover:border-green-500/60"
							:	"bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 animate-pulse-border",
						)}
						title={isComplete ? "Arena Configurada!" : "Configure sua Arena"}>
						{/* Glow effect */}
						<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

						<div className="flex items-center gap-3 relative z-10">
							{isComplete ?
								<Trophy className="h-5 w-5 animate-bounce" />
							: completed === 0 ?
								<Sparkles className="h-5 w-5 animate-pulse" />
							:	<CheckCircle2 className="h-5 w-5" />}
							{!collapsed && (
								<div className="flex flex-col items-start">
									<span className="text-sm font-bold">
										{isComplete ?
											"Arena Pronta! 🎉"
										: completed === 0 ?
											"Comece Aqui!"
										:	`Configure Arena`}
									</span>
									<span className="text-xs opacity-75">
										{isComplete ?
											"Clique para ver"
										:	`${completed}/${total} concluídos`}
									</span>
								</div>
							)}
						</div>

						{!collapsed && (
							<div className="relative z-10 flex items-center gap-2">
								<div
									className={cn(
										"text-xs font-bold px-2 py-1 rounded-full",
										isComplete ? "bg-green-500/30" : "bg-current/20",
									)}>
									{Math.round((completed / total) * 100)}%
								</div>
								<ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
							</div>
						)}

						{/* Badge para modo collapsed */}
						{collapsed && !isComplete && (
							<div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold border-2 border-[#050507] animate-bounce">
								{total - completed}
							</div>
						)}

						{/* Badge de troféu quando completo no collapsed */}
						{collapsed && isComplete && (
							<div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold border-2 border-[#050507]">
								✓
							</div>
						)}
					</button>

					{!collapsed && (
						<p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
							Operação
						</p>
					)}
					{menuItems.map((item) => {
						const btn = (
							<button
								onClick={() => {
									setActiveView(item.id);
									setMobileOpen(false);
								}}
								className={cn(
									"w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]",
									activeView === item.id ?
										"bg-emerald-500/15 text-white font-semibold border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
									:	"text-gray-300 hover:bg-white/5 hover:text-white border border-transparent",
									collapsed ? "justify-center" : "",
								)}>
								<item.icon
									className={cn(
										"h-5 w-5 shrink-0 transition-all duration-200",
										activeView === item.id ?
											"text-emerald-400"
										:	"group-hover:text-white group-hover:scale-110",
									)}
								/>
								{!collapsed && <span className="text-sm">{item.label}</span>}
								{!collapsed && activeView === item.id && (
									<div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
								)}
							</button>
						);
						return collapsed ?
								<Tooltip key={item.id} delayDuration={300}>
									<TooltipTrigger asChild>{btn}</TooltipTrigger>
									<TooltipContent
										side="right"
										className="bg-surface-2 border-white/10 text-white">
										{item.label}
									</TooltipContent>
								</Tooltip>
							:	<div key={item.id}>{btn}</div>;
					})}

					{/* Divisor sutil: Operação vs Sistema */}
					<div className="my-2 border-t border-white/5" aria-hidden />
					{!collapsed && (
						<p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
							Sistema
						</p>
					)}
				</div>

				<div className="p-3 border-t border-white/5 bg-black/20 backdrop-blur-md">
					{collapsed ?
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									onClick={() => {
										setActiveView("config");
										setMobileOpen(false);
									}}
									className={cn(
										"w-full flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white mb-2 border-l-2 border-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]",
										activeView === "config" &&
											"bg-white/5 text-white border-l-emerald-500",
									)}>
									<Settings className="h-5 w-5 shrink-0" />
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="right"
								className="bg-surface-2 border-white/10 text-white">
								Configurações
							</TooltipContent>
						</Tooltip>
					:	<button
							onClick={() => {
								setActiveView("config");
								setMobileOpen(false);
							}}
							className={cn(
								"w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white mb-2 border-l-2 border-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]",
								activeView === "config" &&
									"bg-white/5 text-white border-l-emerald-500",
							)}>
							<Settings className="h-5 w-5 shrink-0" />
							<span className="text-sm">Configurações</span>
						</button>
					}

					{/* Botão de Suporte */}
					{collapsed ?
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									onClick={() => {
										setSupportModalOpen(true);
										setMobileOpen(false);
									}}
									className="w-full flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 border border-transparent mb-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]">
									<Headphones className="h-5 w-5 shrink-0" />
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="right"
								className="bg-surface-2 border-white/10 text-white">
								Suporte
							</TooltipContent>
						</Tooltip>
					:	<button
							onClick={() => {
								setSupportModalOpen(true);
								setMobileOpen(false);
							}}
							className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 border border-transparent mb-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]">
							<Headphones className="h-5 w-5 shrink-0" />
							<span className="text-sm">Suporte</span>
						</button>
					}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className={cn(
									"w-full flex items-center gap-3 p-2 rounded-xl border border-white/5 bg-white/5 mt-2 transition-all duration-200 hover:bg-white/10 hover:border-white/10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507] active:scale-[0.98]",
									collapsed ?
										"justify-center border-none bg-transparent p-0"
									:	"",
								)}>
								<div className="h-9 w-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
									{userProfile?.avatar_url ?
										<img
											src={userProfile.avatar_url}
											alt="User"
											className="h-full w-full object-cover"
										/>
									:	<User className="text-white h-4 w-4" />}
								</div>
								{!collapsed && (
									<div className="flex-1 overflow-hidden text-left">
										<p className="text-sm font-medium text-white truncate">
											{userProfile?.full_name?.split(" ")[0] || "Admin"}
										</p>
										<p className="text-[10px] text-gray-300 uppercase font-bold truncate">
											Logado
										</p>
									</div>
								)}
								{!collapsed && (
									<ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
								)}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align={collapsed ? "center" : "end"}
							side={collapsed ? "right" : "top"}
							sideOffset={8}
							className="min-w-[180px] rounded-xl border border-white/10 bg-surface-2 p-1 shadow-xl shadow-black/30">
							<DropdownMenuItem
								onClick={() => {
									setActiveView("config");
									setMobileOpen(false);
								}}
								className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white focus:outline-none cursor-pointer">
								<User className="h-4 w-4" />
								Perfil
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={async () => {
									if (signOut) {
										await signOut();
										window.location.href = "/login";
									}
								}}
								className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 focus:bg-red-500/20 focus:text-red-400 focus:outline-none cursor-pointer">
								<LogOut className="h-4 w-4" />
								Sair
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</aside>

			{/* Modal do Checklist */}
			<SetupChecklistSidebar
				isOpen={checklistOpen}
				onClose={() => setChecklistOpen(false)}
				onNavigate={(view) => {
					setActiveView(view);
					setMobileOpen(false);
				}}
				tenantId={tenantId}
				userProfile={userProfile}
			/>

			{/* Modal de Suporte */}
			<SupportModal
				open={supportModalOpen}
				onOpenChange={setSupportModalOpen}
			/>
		</>
	);
};

// --- COMPONENTES VISUAIS (Dashboard) ---
type ArenaSysStatusHeroProps = {
	revenueToday: number;
	occupancyAvg: number;
	nextPeak: string;
	planLabel: string;
	planPill: { color: string; text: string };
};

const ArenaSysStatusHero = ({
	revenueToday,
	occupancyAvg,
	nextPeak,
	planLabel,
	planPill,
}: ArenaSysStatusHeroProps) => {
	const statusConfig =
		occupancyAvg > 80 ?
			{
				color: "bg-yellow-500",
				text: "Alta demanda",
				glow: "shadow-yellow-500/10",
			}
		: occupancyAvg > 20 ?
			{
				color: "bg-emerald-500",
				text: "ArenaSys Operando Bem",
				glow: "shadow-emerald-500/10",
			}
		:	{
				color: "bg-gray-500",
				text: "Movimento Tranquilo",
				glow: "shadow-gray-500/10",
			};

	return (
		<div
			className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-surface-2/80 border border-white/5 p-4 sm:p-6 lg:p-8 shadow-xl backdrop-blur-md ${statusConfig.glow}`}>
			{/* Linha superior com shimmer sutil (elemento memorável) */}
			<div
				className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent animate-hero-line"
				aria-hidden
			/>

			<div className="relative z-10 flex flex-col items-center text-center space-y-2 sm:space-y-3">
				<p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-300 w-full text-left sm:text-center">
					Visão do dia
				</p>
				<div className="inline-flex items-center gap-2 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/5 shadow-inner">
					<span
						className={`h-2 w-2 rounded-full ${statusConfig.color} animate-pulse`}
					/>
					<h2 className="text-xs sm:text-sm font-medium text-white">
						{statusConfig.text}
					</h2>
				</div>
				<div className="inline-flex items-center gap-2 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/5 shadow-inner">
					<span className={`h-2 w-2 rounded-full ${planPill.color}`} />
					<h3 className="text-[10px] sm:text-xs font-medium text-white">
						{planPill.text}: <span className="text-gray-300">{planLabel}</span>
					</h3>
				</div>
				<div className="flex gap-4 sm:gap-8 text-xs sm:text-sm text-gray-300 mt-1">
					<div className="flex flex-col">
						<span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-600 font-bold">
							Hoje
						</span>
						<span className="text-white font-bold text-lg sm:text-xl">
							<AnimatedNumber
								value={revenueToday}
								prefix="R$ "
								decimals={2}
								duration={2000}
							/>
						</span>
					</div>
					<div className="w-[1px] bg-white/10" />
					<div className="flex flex-col">
						<span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-600 font-bold">
							Ocupação
						</span>
						<span className="text-white font-bold text-lg sm:text-xl">
							<AnimatedNumber value={occupancyAvg} suffix="%" duration={2000} />
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

type MetricPillProps = {
	label: string;
	value: React.ReactNode;
	icon?: React.ComponentType<{ className?: string }>;
	trend?: string;
};

const MetricPill = ({
	label,
	value,
	icon: Icon,
	trend,
	emptyAction,
}: MetricPillProps & {
	emptyAction?: { label: string; onClick: () => void };
}) => {
	// Check if value is zero-ish (for empty state)
	const isZero =
		value?.toString?.().includes("0,00") ||
		value?.toString?.().includes("0%") ||
		value === 0;

	return (
		<div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-surface-2/80 border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300 backdrop-blur-md group hover:scale-[1.02] shadow-sm hover:shadow-lg hover:shadow-emerald-500/5">
			<div className="flex justify-between items-start mb-2">
				<span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 group-hover:text-gray-300 transition-colors">
					{label}
				</span>
				{Icon && (
					<span className="rounded-xl bg-emerald-500/10 p-2 ring-1 ring-emerald-500/20 transition-colors duration-300 group-hover:bg-emerald-500/20 group-hover:ring-emerald-500/30">
						<Icon className="w-4 h-4 text-emerald-400 transition-colors duration-300 flex-shrink-0" />
					</span>
				)}
			</div>
			<span className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate min-w-0 tabular-nums">
				{value}
			</span>
			{trend && (
				<p
					className={cn(
						"text-[10px] font-medium mt-1.5",
						trend.startsWith("+") ? "text-emerald-400"
						: trend.startsWith("-") ? "text-red-400/90"
						: "text-gray-300",
					)}>
					{trend} vs semana passada
				</p>
			)}
			{isZero && emptyAction && (
				<button
					onClick={emptyAction.onClick}
					className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
					{emptyAction.label} →
				</button>
			)}
		</div>
	);
};

// --- TELA PRINCIPAL (Layout Controller) ---
export default function DashboardHome() {
	const { bookings, timeSlots, loading } = useBookings();
	const [searchParams, setSearchParams] = useSearchParams();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	// Inicializa view com base na URL ou padrão
	const [activeView, setActiveView] = useState(
		searchParams.get("view") || "dashboard",
	);

	// Atualiza view se URL mudar externamente (opcional, mas bom pra navigation)
	useEffect(() => {
		const view = searchParams.get("view");
		if (view && view !== activeView) {
			setActiveView(view);
		}
	}, [searchParams]);

	// Removido: Logs excessivos estavam causando poluição no console
	const { toast } = useToast();
	const { tenantId } = useAuth();
	const {
		subscription,
		isTrial,
		hasAccess,
		isLoading: subLoading,
		isFetching: subFetching,
		hasSubscriptionError,
		refetch: refetchSubscription,
	} = useSubscriptionAccess();
	const [startingCheckout, setStartingCheckout] = useState(false);
	const [startingTrial, setStartingTrial] = useState(false);
	const [syncingCheckout, setSyncingCheckout] = useState(false);
	const syncErrorShownRef = useRef(false);
	const [selectedPlan] = useState<"pro">("pro"); // Apenas um plano agora
	const [billingInterval, setBillingInterval] = useState<"month" | "year">(
		"month",
	);

	// Ler parâmetros da URL para navegação
	useEffect(() => {
		const viewParam = searchParams.get("view");
		if (
			viewParam &&
			[
				"dashboard",
				"agenda",
				"financeiro",
				"mensalistas",
				"folgas",
				"config",
			].includes(viewParam)
		) {
			setActiveView(viewParam);
		}
	}, [searchParams]);

	const planLabel = useMemo(() => {
		return (subscription?.plan_name || "").trim() || "Plano";
	}, [subscription?.plan_name]);

	const planPill = useMemo(() => {
		if (subscription?.status === "active") {
			return { color: "bg-emerald-500", text: "Plano ativo" };
		}
		if (subscription?.status === "past_due") {
			return { color: "bg-yellow-500", text: "Pagamento pendente" };
		}
		if (subscription?.status === "trial") {
			return { color: "bg-yellow-500", text: "Trial" };
		}
		return { color: "bg-gray-500", text: "Plano" };
	}, [subscription?.status]);

	// Apenas um plano agora, sempre "pro" - não precisa de useEffect

	const hasAccessRef = useRef(hasAccess);
	useEffect(() => {
		hasAccessRef.current = hasAccess;
	}, [hasAccess]);

	const subscriptionStatusRef = useRef(subscription?.status);
	useEffect(() => {
		subscriptionStatusRef.current = subscription?.status;
	}, [subscription?.status]);

	useEffect(() => {
		if (!tenantId) return;
		if (!hasAccess || !isTrial) return;
		if (!subscription?.trial_started_at) return;
		const key = `trial_notice_seen_${tenantId}`;
		if (localStorage.getItem(key) === "1") return;
		localStorage.setItem(key, "1");

		const endsAt =
			subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
		const daysLeft =
			endsAt ?
				Math.max(
					0,
					Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
				)
			:	null;

		toast({
			title: "Trial ArenaSys (7 dias) iniciado",
			description:
				daysLeft != null ?
					`Tudo liberado no ArenaSys. Restam ${daysLeft} dia(s) de trial.`
				:	"Tudo liberado no ArenaSys durante o trial de 7 dias.",
		});
	}, [
		hasAccess,
		isTrial,
		subscription?.trial_ends_at,
		subscription?.trial_started_at,
		tenantId,
		toast,
	]);

	const needsTrialConsent =
		isTrial && !subscription?.trial_started_at && Boolean(tenantId);

	const startTrial = async () => {
		try {
			setStartingTrial(true);
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();
			if (sessionError) throw sessionError;
			if (!session?.access_token) {
				throw new Error("Sessão inválida. Faça login novamente.");
			}

			await invokeEdgeFunction("ensure-tenant-subscription", {
				accessToken: session.access_token,
				body: { start_trial: true },
			});
			await refetchSubscription();
			toast({
				title: "Trial ArenaSys iniciado",
				description: "Tudo liberado por 7 dias.",
			});
		} catch (err: unknown) {
			const message = getStringProp(err, "message") || "Tente novamente.";
			toast({
				title: "Não foi possível iniciar o teste",
				description: message,
				variant: "destructive",
			});
		} finally {
			setStartingTrial(false);
		}
	};

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const asaasStatus = params.get("asaas");
		const isAsaasReturn =
			asaasStatus === "success" ||
			asaasStatus === "cancel" ||
			asaasStatus === "expired";
		const isAsaasSuccessReturn = asaasStatus === "success";
		const isAsaasCancelReturn =
			asaasStatus === "cancel" || asaasStatus === "expired";
		const pending = localStorage.getItem("asaas_checkout_pending") === "1";

		if (!pending && !isAsaasReturn) return;
		if (isAsaasCancelReturn) {
			localStorage.removeItem("asaas_checkout_pending");
			return;
		}
		if (!isAsaasReturn && hasAccessRef.current) {
			localStorage.removeItem("asaas_checkout_pending");
			return;
		}

		let cancelled = false;
		setSyncingCheckout(true);

		(async () => {
			const startedAt = Date.now();
			const maxBlockingMs = 12_000;
			while (!cancelled && Date.now() - startedAt < maxBlockingMs) {
				try {
					await refetchSubscription();
				} catch {
					// ignore and keep retrying
				}

				if (hasAccessRef.current) break;
				await new Promise((r) => setTimeout(r, 800));
			}

			const isUpdated = hasAccessRef.current;
			if (isUpdated) {
				localStorage.removeItem("asaas_checkout_pending");
			}
			setSyncingCheckout(false);
			if (
				isAsaasSuccessReturn &&
				!cancelled &&
				!isUpdated &&
				!syncErrorShownRef.current
			) {
				syncErrorShownRef.current = true;
				toast({
					title: "Ainda não confirmamos o pagamento",
					description:
						"Dê alguns segundos e recarregue a página se o acesso ainda não aparecer.",
					variant: "destructive",
				});
			}

			if (isAsaasReturn) {
				const url = new URL(window.location.href);
				url.searchParams.delete("asaas");
				url.searchParams.delete("plan");
				url.searchParams.delete("interval");
				window.history.replaceState({}, "", url.toString());
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [refetchSubscription, subscription?.status, toast]);

	const startCheckout = async () => {
		try {
			setStartingCheckout(true);
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();
			if (sessionError) throw sessionError;
			if (!session?.access_token) {
				throw new Error("Sessão inválida. Faça login novamente.");
			}

			// Guarantee onboarding before checkout (prevents 400: missing tenant_id).
			// If tenantId is missing, try to run the onboarding RPC and re-fetch the profile.
			if (!tenantId) {
				const profileSeed: Record<string, unknown> = {
					id: session.user.id,
					...(session.user.email ? { email: session.user.email } : {}),
				};
				const { error: seedError } = await supabase
					.from("profiles")
					.insert(profileSeed);
				if (seedError) {
					const message = getStringProp(seedError, "message") || "";
					const code = getStringProp(seedError, "code") || "";
					if (!(code === "23505" || /duplicate key|unique/i.test(message))) {
						throw seedError;
					}
				}

				const userMetadata = session.user.user_metadata as unknown as Record<
					string,
					unknown
				>;
				const businessNameFromMetadata =
					(typeof userMetadata.business_name === "string" ?
						userMetadata.business_name
					:	undefined) ||
					(typeof userMetadata.arena_name === "string" ?
						userMetadata.arena_name
					:	undefined);
				const desiredBusinessName =
					(
						typeof businessNameFromMetadata === "string" &&
						businessNameFromMetadata.trim()
					) ?
						businessNameFromMetadata.trim()
					:	"Minha Arena";

				const { error: onboardError } = await supabase.rpc("fn_onboard_user", {
					p_business_name: desiredBusinessName,
					p_saas_slug: "arena-sys",
				});
				if (onboardError) throw onboardError;

				const { data: profileCheck, error: profileCheckError } = await supabase
					.from("profiles")
					.select("tenant_id")
					.eq("id", session.user.id)
					.maybeSingle();
				if (profileCheckError) throw profileCheckError;
				if (!profileCheck?.tenant_id) {
					throw new Error(
						"Seu perfil ainda está sem tenant_id. Faça logout/login e tente novamente.",
					);
				}
			}

			const { data: refreshed, error: refreshError } =
				await supabase.auth.refreshSession();
			if (refreshError || !refreshed?.session?.access_token) {
				await supabase.auth.signOut();
				throw new Error("Sua sessão expirou. Faça login novamente.");
			}
			const accessToken = refreshed.session.access_token;

			const data = await invokeEdgeFunction<{ url?: string }>(
				"asaas-create-checkout",
				{
					accessToken,
					body: {
						plan_code: selectedPlan,
						interval: billingInterval,
					},
				},
			);
			if (!data?.url) throw new Error("Checkout não retornou URL");
			localStorage.setItem("asaas_checkout_pending", "1");
			window.location.href = data.url;
		} catch (err: unknown) {
			console.error(err);
			const message = getStringProp(err, "message") || "";
			if (message.includes("Invalid JWT") || message.startsWith("401 ")) {
				await supabase.auth.signOut();
				toast({
					title: "Sessão expirada",
					description: "Faça login novamente para assinar.",
					variant: "destructive",
				});
				return;
			}
			toast({
				title: "Não foi possível iniciar a assinatura",
				description: message || "Tente novamente.",
				variant: "destructive",
			});
		} finally {
			setStartingCheckout(false);
		}
	};

	const stats = useMemo(() => {
		const today = new Date();
		const todayStr = formatLocalDate(today);
		const lastWeekSameDay = new Date(today);
		lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
		const lastWeekSameDayStr = formatLocalDate(lastWeekSameDay);
		// Inclui todos os jogos de hoje (exceto cancelados)
		const todayBookings = bookings.filter(
			(b) => b.date === todayStr && b.status !== "cancelled",
		);
		const lastWeekSameDayBookings = bookings.filter(
			(b) => b.date === lastWeekSameDayStr && b.status !== "cancelled",
		);

		const monthBookings = bookings.filter((b) => {
			const d = new Date(b.date + "T00:00:00");
			const now = new Date();
			return (
				d.getMonth() === now.getMonth() &&
				d.getFullYear() === now.getFullYear() &&
				b.status !== "cancelled"
			);
		});

		// Receita de hoje: usa paidAmount se disponível, senão totalPrice se pago
		const revenueToday = todayBookings.reduce((acc, b) => {
			if (b.paidAmount && b.paidAmount > 0) {
				return acc + b.paidAmount;
			}
			// Verifica se está pago ou se o jogo já aconteceu (in_progress/completed do banco)
			const statusStr = String(b.status || "");
			if (
				b.paymentStatus === "paid" ||
				statusStr === "in_progress" ||
				statusStr === "completed"
			) {
				return acc + (b.totalPrice || 0);
			}
			return acc;
		}, 0);

		// Receita do mês: mesma lógica
		const revenueMonth = monthBookings.reduce((acc, b) => {
			if (b.paidAmount && b.paidAmount > 0) {
				return acc + b.paidAmount;
			}
			// Verifica se está pago ou se o jogo já aconteceu (in_progress/completed do banco)
			const statusStr = String(b.status || "");
			if (
				b.paymentStatus === "paid" ||
				statusStr === "in_progress" ||
				statusStr === "completed"
			) {
				return acc + (b.totalPrice || 0);
			}
			return acc;
		}, 0);

		// Gráfico da semana (segunda a domingo)
		const weekDays = getCurrentWeekDays();
		const chartData = weekDays.map((dateStr) => {
			const dayBookings = bookings.filter(
				(b) => b.date === dateStr && b.status !== "cancelled",
			);

			const total = dayBookings.reduce((acc, b) => {
				if (b.paidAmount && b.paidAmount > 0) {
					return acc + b.paidAmount;
				}
				// Verifica se está pago ou se o jogo já aconteceu (in_progress/completed do banco)
				const statusStr = String(b.status || "");
				if (
					b.paymentStatus === "paid" ||
					statusStr === "in_progress" ||
					statusStr === "completed"
				) {
					return acc + (b.totalPrice || 0);
				}
				return acc;
			}, 0);

			return {
				day: formatDateShort(dateStr),
				value: total,
				date: dateStr, // Mantém a data para debug
			};
		});

		const uniqueCourts = Array.from(
			new Set(
				timeSlots.map((s) =>
					JSON.stringify({ id: s.fieldId, name: s.courtName }),
				),
			),
		).map((s) => JSON.parse(s));
		const courtsStats = uniqueCourts.map((court) => {
			const slots = timeSlots.filter((s) => s.fieldId === court.id);
			const available = slots.filter((s) => s.status === "available");
			const occupancy =
				slots.length ?
					Math.round(((slots.length - available.length) / slots.length) * 100)
				:	0;
			const nowH = new Date().getHours();
			const nextSlot = available
				.filter((s) => parseInt(s.time.split(":")[0]) >= nowH)
				.sort((a, b) => a.time.localeCompare(b.time))[0];
			return {
				id: court.id,
				name: court.name || `Quadra ${court.id.slice(0, 3)}`,
				occupancy,
				nextFree: nextSlot ? nextSlot.time : "Lotado",
			};
		});

		const chartHasNoData = chartData.every((d) => (d.value ?? 0) === 0);
		const revenueLastWeekSameDay = lastWeekSameDayBookings.reduce((acc, b) => {
			if (b.paidAmount && b.paidAmount > 0) return acc + b.paidAmount;
			const statusStr = String(b.status || "");
			if (
				b.paymentStatus === "paid" ||
				statusStr === "in_progress" ||
				statusStr === "completed"
			) {
				return acc + (b.totalPrice || 0);
			}
			return acc;
		}, 0);
		const trendToday =
			revenueLastWeekSameDay > 0 ?
				`${revenueToday >= revenueLastWeekSameDay ? "+" : ""}${(((revenueToday - revenueLastWeekSameDay) / revenueLastWeekSameDay) * 100).toFixed(0)}%`
			: revenueToday > 0 ? "+100%"
			: undefined;
		return {
			revenueToday,
			revenueMonth,
			gamesToday: todayBookings.length,
			chartData,
			chartHasNoData,
			courtsStats,
			trendToday,
		};
	}, [bookings, timeSlots]);

	const occupancyAvg = Math.round(
		stats.courtsStats.reduce((acc, c) => acc + c.occupancy, 0) /
			(stats.courtsStats.length || 1),
	);
	const focusCourt = stats.courtsStats[0];

	if (loading) return <DashboardSkeleton />;

	if (subLoading || syncingCheckout) {
		return (
			<div className="min-h-screen bg-gray-950 flex items-center justify-center">
				<div className="flex items-center gap-2 text-gray-300">
					<Loader2 className="h-5 w-5 animate-spin" />
					{syncingCheckout ?
						"Confirmando pagamento..."
					:	"Carregando assinatura..."}
				</div>
			</div>
		);
	}

	if (hasSubscriptionError) {
		return (
			<div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
				<Card className="w-full max-w-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
					<CardHeader>
						<CardTitle className="text-white flex items-center gap-2">
							<Lock className="h-5 w-5" /> Falha ao carregar assinatura
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-gray-300">
							Não foi possível ler o status do plano agora. Isso pode acontecer
							por instabilidade de rede ou policy/RLS.
						</p>
						<Button
							type="button"
							onClick={() => window.location.reload()}
							className="w-full">
							Recarregar
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// New signup flow: show trial notice first; start trial only after consent.
	if (needsTrialConsent) {
		return (
			<div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
				<Card className="w-full max-w-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
					<CardHeader>
						<CardTitle className="text-white flex items-center gap-2">
							<Trophy className="h-5 w-5" /> Trial do Plano Pro (7 dias) — tudo
							liberado
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-gray-300">
							Seu cadastro foi criado. Você tem direito a um trial de 7 dias do
							Plano Pro, com tudo liberado.
						</p>
						<p className="text-xs text-gray-300">
							Ao clicar em “Começar trial”, ele é iniciado agora e termina em 21
							dias. Ao expirar, o sistema cai na tela de assinatura.
						</p>
						<Button
							type="button"
							onClick={startTrial}
							disabled={startingTrial}
							className="w-full bg-white text-gray-950 hover:bg-gray-200 font-bold">
							{startingTrial ?
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Iniciando...
								</>
							:	"Começar trial do Plano Pro (7 dias)"}
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Hard paywall: após expirar trial + carência, bloqueia o painel
	if (!hasAccess) {
		const planMatrix = [
			{
				plan: "pro",
				label: "Arena System",
				tagline: "Tudo que você precisa para gerenciar sua arena",
				badge: "Único Plano",
				monthly: "R$ 97/mês",
				annual: "R$ 1.164/ano (12x de R$ 97)",
				foundersMonthly: "R$ 67,90/mês",
				foundersAnnual: "R$ 814,80/ano (12x de R$ 67,90)",
				highlights: [
					"Agenda inteligente e link público de reservas",
					"Pagamento via Pix integrado",
					"Múltiplas quadras e gestão de mensalistas",
					"Relatórios avançados e suporte prioritário",
				],
			},
		];
		const checkoutSteps = [
			{
				number: "01",
				title: "Escolha o plano",
				description: "Selecione Pro ou Start e decida se quer mensal ou anual.",
			},
			{
				number: "02",
				title: "Checkout oficial Asaas",
				description:
					"Escolha Cartão de Crédito no checkout para parcelar em até 12x sem juros. Outras formas de pagamento também disponíveis.",
			},
			{
				number: "03",
				title: "Confirme e volte",
				description: "Assim que o pagamento é confirmado, liberamos o acesso.",
			},
		];
		return (
			<div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
				<Card className="w-full max-w-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
					<CardHeader>
						<CardTitle className="text-white flex items-center gap-2">
							<Lock className="h-5 w-5" /> Acesso bloqueado
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<section className="rounded-3xl bg-gradient-to-r from-emerald-500/20 to-blue-500/10 border border-white/20 p-6 space-y-3 shadow-[0_20px_50px_rgba(5,150,105,0.25)]">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
										Checkout transparente
									</p>
									<h3 className="text-xl font-bold text-white">
										Planos ArenaSys
									</h3>
								</div>
								<span className="rounded-full bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white">
									Asaas
								</span>
							</div>
							<p className="text-sm text-white/80">
								Nosso processo de assinatura mostra exatamente o valor, o
								parcelamento e cada etapa antes de ir para o Asaas.
							</p>
							<div className="grid grid-cols-2 gap-4 text-[11px] text-white/70">
								<div className="flex flex-col">
									<span className="uppercase tracking-[0.4em] text-emerald-200">
										Parcelamento
									</span>
									<strong className="text-lg text-white">até 12x*</strong>
								</div>
								<div className="flex flex-col">
									<span className="uppercase tracking-[0.4em] text-emerald-200">
										Suporte
									</span>
									<strong className="text-lg text-white">Prioritário</strong>
								</div>
							</div>
						</section>
						<section className="space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
									Escolha uma base
								</p>
								<p className="text-xs text-gray-300">
									Toque no cartão para ver o preço mensal e anual.
								</p>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								{planMatrix.map((plan) => {
									const isActive = selectedPlan === plan.plan;
									return (
										<div
											key={plan.plan}
											className={cn(
												"rounded-3xl border p-5 space-y-4 transition-all",
												isActive ?
													"border-emerald-400 bg-emerald-500/10 shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
												:	"border-white/10 bg-white/5",
											)}>
											<div className="flex items-start justify-between">
												<div>
													<p className="text-base font-semibold text-white">
														{plan.label}
													</p>
													<p className="text-xs text-gray-300">
														{plan.tagline}
													</p>
												</div>
												{plan.badge && (
													<span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
														{plan.badge}
													</span>
												)}
											</div>
											<div className="grid grid-cols-2 gap-3">
												{[
													{
														label: "Mensal",
														price: plan.monthly,
														active:
															selectedPlan === plan.plan &&
															billingInterval === "month",
													},
													{
														label: "Anual",
														price: plan.annual,
														active:
															selectedPlan === plan.plan &&
															billingInterval === "year",
													},
												].map((priceOption) => (
													<div
														key={priceOption.label}
														className={cn(
															"rounded-2xl border p-3 text-sm",
															priceOption.active ?
																"border-emerald-400 bg-emerald-500/10 text-white"
															:	"border-white/10 bg-white/5 text-gray-200",
														)}>
														<p className="uppercase tracking-[0.3em] text-[10px]">
															{priceOption.label}
														</p>
														<p className="text-lg font-bold">
															{priceOption.price}
														</p>
													</div>
												))}
											</div>
											<ul className="space-y-1 text-[12px] text-gray-300">
												{plan.highlights.map((item) => (
													<li key={item} className="flex items-start gap-2">
														<span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
														<span>{item}</span>
													</li>
												))}
											</ul>
										</div>
									);
								})}
							</div>
						</section>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div className="w-full p-3 bg-white/5 rounded-lg border border-white/10 text-center">
								<p className="text-sm font-medium text-white mb-1">
									Arena System
								</p>
								<p className="text-xs text-gray-300">
									{billingInterval === "year" ?
										"R$ 1.164/ano (12x de R$ 97)"
									:	"R$ 97/mês"}
								</p>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<Button
								type="button"
								variant={billingInterval === "month" ? "default" : "outline"}
								onClick={() => setBillingInterval("month")}
								className={
									billingInterval === "month" ?
										"bg-primary text-primary-foreground w-full"
									:	"border-white/20 hover:bg-white/5 text-white w-full"
								}>
								Mensal
							</Button>
							<Button
								type="button"
								variant={billingInterval === "year" ? "default" : "outline"}
								onClick={() => setBillingInterval("year")}
								className={
									billingInterval === "year" ?
										"bg-primary text-primary-foreground w-full"
									:	"border-white/20 hover:bg-white/5 text-white w-full"
								}>
								Anual
							</Button>
						</div>
						<Button
							type="button"
							onClick={startCheckout}
							disabled={startingCheckout}
							className="w-full bg-white text-gray-950 hover:bg-gray-200 font-bold">
							{startingCheckout ?
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Redirecionando...
								</>
							:	"Assinar com Asaas"}
						</Button>
						<p className="text-[11px] text-gray-300">
							Recomendamos o Pro para usar tudo liberado. Pagamento seguro pelo
							Asaas com transparência total.
						</p>
						<div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 text-sm text-gray-200">
							<p className="text-[11px] uppercase tracking-[0.3em] text-gray-300">
								Fluxo do checkout
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								{checkoutSteps.map((step) => (
									<div key={step.title} className="space-y-1">
										<p className="text-2xl font-bold text-white">
											{step.number}
										</p>
										<p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
											{step.title}
										</p>
										<p className="text-sm text-white/70">{step.description}</p>
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-surface-0 text-white font-sans selection:bg-emerald-500/30 relative overflow-hidden">
			{/* Background Noise & Gradient - FIXED para evitar espaço extra no mobile */}
			<div className="fixed inset-0 z-0 pointer-events-none">
				<div
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
					}}
				/>
				<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
				<div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
			</div>

			<SidebarFixed
				mobileOpen={mobileOpen}
				setMobileOpen={setMobileOpen}
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				activeView={activeView}
				setActiveView={setActiveView}
				tenantId={tenantId || ""}
			/>

			<div
				className={cn(
					"relative z-10 flex flex-col transition-all duration-300 ease-out",
					collapsed ? "md:pl-20" : "md:pl-72",
				)}>
				{/* Header Mobile */}
				<div className="md:hidden sticky top-0 z-30 bg-surface-0/80 backdrop-blur-lg border-b border-white/5 px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5 text-emerald-500" />
						<span className="font-bold text-lg tracking-tight">ArenaSys</span>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setMobileOpen(true)}>
						<Menu className="w-6 h-6 text-white" />
					</Button>
				</div>

				{/* Trial Banner */}
				<TrialBanner tenantId={tenantId || ""} />

				<main
					data-dashboard
					className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
					{activeView === "dashboard" && (
						<div className="space-y-6">
							<ArenaSysStatusHero
								revenueToday={stats.revenueToday}
								occupancyAvg={occupancyAvg}
								nextPeak="19:00 — 21:00"
								planLabel={planLabel}
								planPill={planPill}
							/>

							<div className="grid grid-cols-3 gap-4">
								<MetricPill
									label="Receita Hoje"
									value={
										<AnimatedNumber
											value={stats.revenueToday}
											prefix="R$ "
											decimals={2}
											duration={2000}
										/>
									}
									icon={TrendingUp}
									trend={stats.trendToday}
								/>
								<MetricPill
									label="Jogos Hoje"
									value={
										<AnimatedNumber value={stats.gamesToday} duration={1500} />
									}
									icon={Trophy}
								/>
								<MetricPill
									label="Ocupação Hoje"
									value={
										<AnimatedNumber
											value={occupancyAvg}
											suffix="%"
											duration={2000}
										/>
									}
									icon={User}
								/>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<Card className="lg:col-span-2 bg-surface-2/80 border border-white/5 rounded-3xl overflow-hidden shadow-lg backdrop-blur-md">
									<CardHeader>
										<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
											<Activity className="w-4 h-4 text-emerald-500" />{" "}
											Performance da Semana
										</CardTitle>
									</CardHeader>
									<CardContent className="h-[200px] sm:h-[250px] px-2 sm:px-4">
										{stats.chartHasNoData && (
											<div className="flex flex-col items-center justify-center py-6 text-center">
												<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
													<Activity className="w-7 h-7 text-emerald-400/50" />
												</div>
												<p className="text-gray-300 text-sm font-medium mb-1">
													Tudo pronto para começar!
												</p>
												<p className="text-gray-300 text-xs mb-3">
													Agende o primeiro jogo e veja a mágica acontecer
												</p>
												<button
													type="button"
													onClick={() => setActiveView("agenda")}
													className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium rounded-full transition-colors">
													Agendar primeiro jogo +
												</button>
											</div>
										)}
										<ResponsiveContainer
											width="100%"
											height={
												stats.chartHasNoData ? "calc(100% - 28px)" : "100%"
											}>
											<AreaChart
												data={stats.chartData}
												margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
												<defs>
													<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
														<stop
															offset="5%"
															stopColor="#10b981"
															stopOpacity={0.3}
														/>
														<stop
															offset="95%"
															stopColor="#10b981"
															stopOpacity={0}
														/>
													</linearGradient>
												</defs>
												<CartesianGrid
													stroke="rgba(255,255,255,0.03)"
													vertical={false}
												/>
												<XAxis
													dataKey="day"
													axisLine={false}
													tickLine={false}
													tick={{ fill: "#999", fontSize: 10 }}
													height={35}
													interval={0}
													angle={0}
													textAnchor="middle"
													padding={{ left: 5, right: 5 }}
												/>
												<RechartsTooltip
													contentStyle={{
														backgroundColor: "#0F1115",
														borderRadius: "12px",
														border: "1px solid rgba(255,255,255,0.08)",
														boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
														padding: "10px 14px",
													}}
													itemStyle={{ color: "#fff" }}
													formatter={(value: number | string) => {
														const n =
															typeof value === "number" ? value : Number(value);
														return [
															formatCurrency(Number.isFinite(n) ? n : 0),
															"Receita",
														];
													}}
												/>
												<Area
													type="monotone"
													dataKey="value"
													stroke="#10b981"
													strokeWidth={3}
													fill="url(#grad)"
													animationDuration={2000}
													animationEasing="ease-out"
												/>
											</AreaChart>
										</ResponsiveContainer>
									</CardContent>
								</Card>

								{focusCourt && (
									<Card className="bg-surface-2/80 border border-white/5 rounded-2xl relative overflow-hidden group backdrop-blur-md shadow-sm hover:shadow-lg transition-shadow">
										<CardContent className="p-6 flex flex-col justify-between h-full">
											<div>
												<div className="flex justify-between items-start mb-4">
													<span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
														Quadra em destaque
													</span>
													<Trophy className="w-5 h-5 text-gray-600" />
												</div>
												<h3 className="text-xl font-bold text-white mb-1">
													{focusCourt.name}
												</h3>
												<p className="text-sm text-gray-300 mb-2">
													Ocupação:{" "}
													<span className="text-white font-bold tabular-nums">
														{focusCourt.occupancy}%
													</span>
												</p>
												<div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
													<div
														className={cn(
															"h-full rounded-full transition-all duration-500",
															focusCourt.occupancy >= 80 ? "bg-amber-500"
															: focusCourt.occupancy >= 50 ? "bg-emerald-500"
															: "bg-emerald-500/70",
														)}
														style={{
															width: `${Math.min(focusCourt.occupancy, 100)}%`,
														}}
													/>
												</div>
											</div>
											<div className="mt-4 pt-4 border-t border-white/[0.08] space-y-3">
												<div>
													<p className="text-[10px] text-gray-300 uppercase mb-1">
														Próximo livre
													</p>
													<p
														className={cn(
															"text-2xl font-mono tracking-tighter",
															focusCourt.nextFree === "Lotado" ?
																"text-amber-400 font-bold"
															:	"text-white",
														)}>
														{focusCourt.nextFree}
													</p>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setActiveView("agenda")}
													className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs font-medium rounded-xl">
													Ver agenda
												</Button>
											</div>
										</CardContent>
									</Card>
								)}
							</div>
						</div>
					)}

					{activeView === "agenda" && (
						<div
							key="agenda"
							className="animate-in fade-in slide-in-from-right-2 duration-300">
							<AgendaMaster />
						</div>
					)}
					{activeView === "financeiro" && (
						<div
							key="financeiro"
							className="animate-in fade-in slide-in-from-right-2 duration-300">
							<FinanceiroView
								onNavigateToAgenda={() => setActiveView("agenda")}
							/>
						</div>
					)}
					{activeView === "mensalistas" && (
						<div
							key="mensalistas"
							className="animate-in fade-in slide-in-from-right-2 duration-300">
							<MensalistasView />
						</div>
					)}
					{activeView === "folgas" && (
						<div
							key="folgas"
							className="animate-in fade-in slide-in-from-right-2 duration-300">
							<FolgasView />
						</div>
					)}
					{activeView === "config" && (
						<div
							key="config"
							className="animate-in fade-in slide-in-from-right-2 duration-300">
							<ConfiguracoesView />
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
