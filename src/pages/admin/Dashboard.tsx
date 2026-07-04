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
	Repeat,
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
	Moon,
	Sun,
	Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
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
import { Switch } from "@/components/ui/switch";
import { useBookings } from "@/contexts/BookingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { supabase } from "@/lib/supabaseClient";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import {
	SetupChecklistSidebar,
	useSetupProgress,
} from "@/components/admin/SetupChecklistSidebar";
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
import { AdminMetric } from "@/components/admin/AdminUI";

const DashboardSkeleton = () => (
	<div className="w-full flex bg-[#eef4fb]">
		{/* Sidebar Skeleton */}
		<div className="hidden md:flex w-[236px] flex-col gap-4 p-4 border-r border-slate-200 bg-white shrink-0">
			<div className="h-20 w-full bg-slate-100 animate-pulse rounded-lg" />
			<div className="space-y-3 pt-6">
				{[1, 2, 3, 4, 5].map((i) => (
					<div
						key={i}
						className="h-12 w-full bg-slate-100 animate-pulse rounded-lg"
					/>
				))}
			</div>
		</div>
		{/* Content Skeleton */}
		<div className="flex-1 p-4 md:p-8 space-y-6 overflow-hidden">
			<div className="h-32 w-full bg-slate-100 animate-pulse rounded-lg" />
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="h-32 bg-slate-100 animate-pulse rounded-lg" />
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 h-96 bg-slate-100 animate-pulse rounded-lg" />
				<div className="h-96 bg-slate-100 animate-pulse rounded-lg" />
			</div>
		</div>
	</div>
);

const ThemeToggleButton = ({ collapsed = false }: { collapsed?: boolean }) => {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isLight = mounted && resolvedTheme === "light";
	const Icon = isLight ? Moon : Sun;
	const label = isLight ? "Usar tema escuro" : "Usar tema claro";
	const nextTheme = isLight ? "dark" : "light";

	return (
		<Tooltip delayDuration={300}>
			<TooltipTrigger asChild>
				<div
					className={cn(
						"relative flex items-center rounded-[var(--az-radius-control)] text-[color:var(--az-ink-soft)]",
						collapsed ? "h-10 w-10 justify-center border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)]" : "w-full gap-2.5 px-3 py-[9px]",
					)}>
					<Icon className="h-[17px] w-[17px] shrink-0" />
					{!collapsed && (
						<>
							<span className="min-w-0 flex-1 text-[13px]">Tema escuro</span>
							<Switch
								checked={!isLight}
								onCheckedChange={() => setTheme(nextTheme)}
								aria-label={label}
								className="h-[17px] w-[30px] border-0 bg-[color:var(--az-line)] data-[state=checked]:bg-[color:var(--az-navy)] [&>span]:h-[13px] [&>span]:w-[13px] [&>span]:bg-white [&>span]:shadow-[0_0_0_0.5px_var(--az-line)] [&>span]:data-[state=checked]:translate-x-[13px]"
							/>
						</>
					)}
					{collapsed && (
						<button
							type="button"
							aria-label={label}
							onClick={() => setTheme(nextTheme)}
							className="absolute inset-0 rounded-[var(--az-radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)]"
						/>
					)}
				</div>
			</TooltipTrigger>
			<TooltipContent side={collapsed ? "right" : "top"}>
				{label}
			</TooltipContent>
		</Tooltip>
	);
};

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

const timeToMinutes = (time: string) => {
	const [hours = "0", minutes = "0"] = time.split(":");
	return Number(hours) * 60 + Number(minutes);
};

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

// --- COMPONENTE: SIDEBAR ---
type SidebarFixedProps = {
	mobileOpen: boolean;
	setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
	collapsed: boolean;
	setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
	activeView: string;
	setActiveView: React.Dispatch<React.SetStateAction<string>>;
	tenantId: string;
};

const SIDEBAR_MENU_ITEMS = [
	{ id: "dashboard", icon: Home, label: "Visão Geral" },
	{ id: "agenda", icon: Calendar, label: "Reservas" },
	{ id: "financeiro", icon: BarChart, label: "Financeiro" },
	{ id: "mensalistas", icon: Repeat, label: "Mensalistas" },
	{ id: "folgas", icon: Clock, label: "Gerenciar Folgas" },
] as const;

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
	const { subscription, isTrial } = useSubscriptionAccess();
	const [checklistOpen, setChecklistOpen] = useState(false);
	const [supportModalOpen, setSupportModalOpen] = useState(false);

	// Hook para progresso do checklist
	const { completed, total, isComplete } = useSetupProgress(
		tenantId,
		userProfile,
	);
	const progressPercent = Math.round((completed / Math.max(total, 1)) * 100);
	const pendingSetupItems = Math.max(0, total - completed);
	const trialEndsAt =
		subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
	const trialDaysLeft =
		trialEndsAt && !Number.isNaN(trialEndsAt.getTime()) ?
			Math.max(
				0,
				Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
			)
		:	null;
	const statusLine =
		isTrial ?
			`Trial · ${trialDaysLeft ?? 0} dias restantes`
		: subscription?.status === "active" ?
			"Plano ativo"
		:	"Status do plano em atualização";
	const setupSummary =
		isComplete ? "Tudo alinhado"
		: pendingSetupItems === 1 ? "1 item pendente"
		: `${pendingSetupItems} itens pendentes`;
	const SetupIcon = isComplete ? CheckCircle2 : Sparkles;

	return (
		<>
			<aside
				className={cn(
					"fixed left-0 top-0 z-50 flex h-full flex-col border-r-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] transition-all duration-300 ease-out",
					mobileOpen ? "translate-x-0 w-[236px]" : (
						"-translate-x-full md:translate-x-0"
					),
					collapsed ? "md:w-20" : "md:w-[236px]",
				)}>
				<div
					className={cn(
						"flex items-center bg-[color:var(--az-surface)]",
						collapsed ? "h-16 justify-center px-0" : "justify-between px-[10px] pb-0 pt-4",
					)}>
					{!collapsed && (
						<div className="flex items-center gap-2.5 px-1.5 pb-3.5 pt-1">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] font-archivo text-[13px] font-semibold text-white">
								AS
							</div>
							<div>
								<h1 className="font-archivo text-sm font-semibold leading-tight tracking-normal text-[color:var(--az-ink)]">
									ArenaSys
								</h1>
								<p className="text-[10.5px] leading-tight tracking-normal text-[color:var(--az-ink-soft)]">
									Gestão da arena
								</p>
							</div>
						</div>
					)}
					{collapsed && (
						<div className="flex h-8 w-8 items-center justify-center rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] font-archivo text-[13px] font-semibold text-white">
							AS
						</div>
					)}

					<button
						type="button"
						onClick={() => setCollapsed(!collapsed)}
						aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
						className="hidden h-7 w-7 items-center justify-center rounded-[var(--az-radius-control)] text-[color:var(--az-ink-soft)] transition-colors hover:bg-[color:var(--az-navy-soft)] hover:text-[color:var(--az-ink)] md:flex"
						title={collapsed ? "Expandir" : "Recolher"}>
						{collapsed ?
							<ChevronRight className="h-4 w-4" />
						:	<ChevronLeft className="h-4 w-4" />}
					</button>
					<button
						type="button"
						onClick={() => setMobileOpen(false)}
						aria-label="Fechar menu"
						className="flex h-9 w-9 items-center justify-center rounded-[var(--az-radius-control)] text-[color:var(--az-ink-soft)] hover:bg-[color:var(--az-navy-soft)] md:hidden">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto px-[10px] py-0 custom-scrollbar">
					<button
						type="button"
						onClick={() => setChecklistOpen(true)}
						aria-label={
							isComplete ?
								"Arena configurada"
							:	"Abrir checklist de configuração da arena"
						}
						className={cn(
							"relative mx-0.5 mb-[6px] w-[calc(100%-4px)] rounded-[10px] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-paper)] text-left transition-colors duration-200 hover:bg-[color:var(--az-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
							collapsed ? "flex h-14 items-center justify-center p-0" : "px-3 py-[11px]",
						)}
						title={isComplete ? "Arena Configurada!" : "Configure sua Arena"}>
						{collapsed ? (
							<>
								<SetupIcon className="h-5 w-5 text-[color:var(--az-navy)]" />
								<span className="absolute -right-1 -top-1 rounded-full border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--az-ink)]">
									{progressPercent}%
								</span>
							</>
						) : (
							<div>
								<div className="mb-2 flex items-center gap-2">
									<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--az-radius-control)] bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)]">
										<SetupIcon className="h-3.5 w-3.5" />
									</span>
									<span className="min-w-0 flex-1 text-[11.5px] font-medium leading-tight text-[color:var(--az-ink)]">
										Configuração da arena
									</span>
									<span className="rounded-full border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-[color:var(--az-ink)]">
										{progressPercent}%
									</span>
								</div>
								<div className="mb-2 h-1 overflow-hidden rounded-[2px] bg-[color:var(--az-line)]">
									<div
										className="h-full rounded-[2px] bg-[color:var(--az-navy)]"
										style={{ width: `${progressPercent}%` }}
									/>
								</div>
								<p className="text-[10.5px] leading-snug text-[color:var(--az-ink-soft)]">
									<span className="font-medium text-[color:var(--az-ink)]">
										{setupSummary}
									</span>
									<span className="mx-1 text-[color:var(--az-line)]">·</span>
									{statusLine}
								</p>
							</div>
						)}
					</button>

					{!collapsed && (
						<p className="px-3 pb-1.5 pt-4 text-[10px] font-medium uppercase tracking-[0.06em] text-[color:var(--az-ink-soft)] opacity-70">
							Operação
						</p>
					)}
					{SIDEBAR_MENU_ITEMS.map((item) => {
						const btn = (
							<button
								type="button"
								onClick={() => {
									setActiveView(item.id);
									setMobileOpen(false);
								}}
								aria-label={item.label}
								aria-current={activeView === item.id ? "page" : undefined}
								className={cn(
									"group relative flex w-full items-center gap-2.5 rounded-[var(--az-radius-control)] px-3 py-[9px] text-left text-[13px] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
									activeView === item.id ?
										"bg-[color:var(--az-navy-soft)] font-medium text-[color:var(--az-navy)]"
									:	"text-[color:var(--az-ink-soft)] hover:bg-[color:var(--az-paper)] hover:text-[color:var(--az-ink)]",
									collapsed ? "justify-center" : "",
								)}>
								<item.icon
									className={cn(
										"h-[17px] w-[17px] shrink-0 transition-all duration-200",
										activeView === item.id ?
											"text-[color:var(--az-navy)]"
										:	"text-[color:var(--az-ink-soft)] group-hover:text-[color:var(--az-ink)]",
									)}
								/>
								{!collapsed && <span>{item.label}</span>}
							</button>
						);
						return collapsed ?
								<Tooltip key={item.id} delayDuration={300}>
									<TooltipTrigger asChild>{btn}</TooltipTrigger>
									<TooltipContent
										side="right"
										className="border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink)]">
										{item.label}
									</TooltipContent>
								</Tooltip>
							:	<div key={item.id}>{btn}</div>;
					})}

					{!collapsed && (
						<p className="px-3 pb-1.5 pt-4 text-[10px] font-medium uppercase tracking-[0.06em] text-[color:var(--az-ink-soft)] opacity-70">
							Sistema
						</p>
					)}
					{collapsed ?
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => {
										setActiveView("config");
										setMobileOpen(false);
									}}
									aria-label="Configurações"
									aria-current={activeView === "config" ? "page" : undefined}
									className={cn(
										"flex w-full items-center justify-center rounded-[var(--az-radius-control)] px-3 py-[9px] text-[color:var(--az-ink-soft)] transition-colors duration-200 outline-none hover:bg-[color:var(--az-paper)] hover:text-[color:var(--az-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--az-paper)]",
										activeView === "config" &&
											"bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)]",
									)}>
									<Settings className="h-[17px] w-[17px] shrink-0" />
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="right"
								className="border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink)]">
								Configurações
							</TooltipContent>
						</Tooltip>
					:	<button
							type="button"
							onClick={() => {
								setActiveView("config");
								setMobileOpen(false);
							}}
							aria-label="Configurações"
							aria-current={activeView === "config" ? "page" : undefined}
							className={cn(
								"flex w-full items-center gap-2.5 rounded-[var(--az-radius-control)] px-3 py-[9px] text-[13px] text-[color:var(--az-ink-soft)] transition-colors duration-200 outline-none hover:bg-[color:var(--az-paper)] hover:text-[color:var(--az-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--az-paper)]",
								activeView === "config" &&
									"bg-[color:var(--az-navy-soft)] font-medium text-[color:var(--az-navy)]",
							)}>
							<Settings className="h-[17px] w-[17px] shrink-0" />
							<span>Configurações</span>
						</button>
					}

					{/* Botão de Suporte */}
					{collapsed ?
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => {
										setSupportModalOpen(true);
										setMobileOpen(false);
									}}
									aria-label="Suporte"
									className="flex w-full items-center justify-center rounded-[var(--az-radius-control)] px-3 py-[9px] text-[color:var(--az-ink-soft)] transition-colors duration-200 outline-none hover:bg-[color:var(--az-paper)] hover:text-[color:var(--az-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--az-paper)]">
									<Headphones className="h-[17px] w-[17px] shrink-0" />
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="right"
								className="border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink)]">
								Suporte
							</TooltipContent>
						</Tooltip>
					:	<button
							type="button"
							onClick={() => {
								setSupportModalOpen(true);
								setMobileOpen(false);
							}}
							aria-label="Suporte"
							className="flex w-full items-center gap-2.5 rounded-[var(--az-radius-control)] px-3 py-[9px] text-[13px] text-[color:var(--az-ink-soft)] transition-colors duration-200 outline-none hover:bg-[color:var(--az-paper)] hover:text-[color:var(--az-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--az-paper)]">
							<Headphones className="h-[17px] w-[17px] shrink-0" />
							<span>Suporte</span>
						</button>
					}
				</div>

				<div className="bg-[color:var(--az-surface)] px-[10px] pb-4">
					<div className="mb-[6px]">
						<ThemeToggleButton collapsed={collapsed} />
					</div>

					<div className="mx-0.5 mt-1 border-t-[0.5px] border-[color:var(--az-line)] pt-2.5" />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label="Abrir menu do usuário"
								className={cn(
									"flex w-full items-center gap-2.5 rounded-[var(--az-radius-control)] px-2.5 py-1.5 transition-colors duration-200 outline-none hover:bg-[color:var(--az-paper)] focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--az-paper)] active:scale-[0.98]",
									collapsed ?
										"justify-center border-none bg-transparent p-0"
									:	"",
								)}>
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--az-navy)]">
									<span className="text-[12px] font-medium uppercase text-white">
										{(userProfile?.full_name || "Admin").trim().slice(0, 1)}
									</span>
								</div>
								{!collapsed && (
									<div className="flex-1 overflow-hidden text-left">
										<p className="truncate text-[12.5px] font-medium leading-snug text-[color:var(--az-ink)]">
											{userProfile?.full_name?.split(" ")[0] || "Admin"}
										</p>
										<p className="truncate text-[10.5px] leading-snug text-[color:var(--az-ink-soft)]">
											Logado
										</p>
									</div>
								)}
								{!collapsed && (
									<ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--az-ink-soft)]" />
								)}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align={collapsed ? "center" : "end"}
							side={collapsed ? "right" : "top"}
							sideOffset={8}
							className="min-w-[180px] rounded-[var(--az-radius-control)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] p-1">
							<DropdownMenuItem
								onClick={() => {
									setActiveView("config");
									setMobileOpen(false);
								}}
								className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 focus:bg-slate-50 focus:text-slate-950 focus:outline-none cursor-pointer">
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
								className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 focus:bg-red-50 focus:text-red-600 focus:outline-none cursor-pointer">
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
type DashboardBookingSummary = {
	id: string;
	time: string;
	fieldName: string;
	customerName: string;
	totalPrice: number;
	paidAmount?: number;
	remaining: number;
	paymentStatus: string;
};

type PrimeOpenSlot = {
	time: string;
	courtName?: string;
};

type CourtTimelineSlot = {
	time: string;
	status: "available" | "paid" | "pending" | "blocked";
	customerName?: string;
};

type CourtTimelineRow = {
	courtId: string;
	courtName: string;
	occupancy: number;
	slots: CourtTimelineSlot[];
};

type OperationalAlert = {
	id: string;
	title: string;
	description: string;
	tone: "blue" | "yellow" | "red" | "green";
	actionLabel?: string;
	onClick?: () => void;
};

const getGreeting = () => {
	const hour = new Date().getHours();
	if (hour < 12) return "Bom dia";
	if (hour < 18) return "Boa tarde";
	return "Boa noite";
};

const getDashboardDateLabel = () =>
	new Intl.DateTimeFormat("pt-BR", {
		weekday: "long",
		day: "2-digit",
		month: "long",
	}).format(new Date());

const DashboardTopbar = ({
	userName,
	onOpenAgenda,
	onOpenFinanceiro,
}: {
	userName?: string;
	onOpenAgenda: () => void;
	onOpenFinanceiro: () => void;
}) => (
	<section className="flex flex-col gap-4 border-b-[0.5px] border-[color:var(--az-line)] pb-6 pt-1 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
		<div className="min-w-0">
			<h2 className="font-['Archivo'] text-[26px] font-semibold leading-[1.12] tracking-normal text-[color:var(--az-ink)] sm:text-[30px] dark:text-white">
				{getGreeting()}
				{userName ? `, ${userName.split(" ")[0]}` : ""}.
			</h2>
			<p className="mt-2 text-[14px] leading-5 capitalize text-[color:var(--az-ink-soft)] sm:text-[15px] dark:text-slate-400">
				{getDashboardDateLabel()} · operação da arena em tempo real
			</p>
		</div>

		<div className="flex flex-col gap-2 sm:flex-row">
			<Button
				type="button"
				onClick={onOpenAgenda}
				className="rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] px-4 font-medium text-white hover:bg-[color:var(--az-navy)]">
				<Calendar className="mr-2 h-4 w-4" />
				Nova reserva
			</Button>
			<Button
				type="button"
				variant="outline"
				onClick={onOpenFinanceiro}
				className="rounded-[var(--az-radius-control)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] px-4 font-medium text-[color:var(--az-ink)] hover:bg-[color:var(--az-navy-soft)] dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]">
				<BarChart className="mr-2 h-4 w-4" />
				Financeiro
			</Button>
		</div>
	</section>
);

const DailyStatusStrip = ({
	nextBooking,
	occupiedNow,
	availableNow,
	totalCourts,
	occupancyAvg,
	gamesToday,
	revenueMonth,
	pendingRevenue,
	pendingBookingsCount,
	primeOpenSlot,
	onOpenAgenda,
	onOpenFinanceiro,
}: {
	nextBooking?: DashboardBookingSummary;
	occupiedNow: number;
	availableNow: number;
	totalCourts: number;
	occupancyAvg: number;
	gamesToday: number;
	revenueMonth: number;
	pendingRevenue: number;
	pendingBookingsCount: number;
	primeOpenSlot?: PrimeOpenSlot;
	onOpenAgenda: () => void;
	onOpenFinanceiro: () => void;
}) => {
	const hasNextBooking = Boolean(nextBooking);
	const isEmptyDay = gamesToday === 0 && !hasNextBooking;
	const statusTitle =
		hasNextBooking ? `${nextBooking?.time} em ${nextBooking?.fieldName}`
		: isEmptyDay ? "Agenda livre hoje"
		: primeOpenSlot ? `${primeOpenSlot.time} livre para venda`
		: "Agenda sem próximas reservas";
	const statusDescription =
		hasNextBooking ?
			`${nextBooking?.customerName} é a próxima reserva confirmada no painel.`
		: isEmptyDay && primeOpenSlot ?
			`${primeOpenSlot.courtName || "Uma quadra"} tem abertura às ${primeOpenSlot.time}.`
		: isEmptyDay ?
			"O dia está limpo para montar a primeira reserva."
		: primeOpenSlot ?
			`${primeOpenSlot.courtName || "Uma quadra"} está disponível agora para preencher a grade.`
		:	"O dia está limpo. Use a agenda para registrar a primeira reserva.";
	const metricItems = [
		{
			label: "Reservas",
			value: gamesToday.toString(),
			helper: hasNextBooking ? `próxima ${nextBooking?.time}` : "hoje",
		},
		{
			label: "Quadras",
			value: `${occupiedNow}/${totalCourts || 0}`,
			helper: `${availableNow} livres`,
		},
		{
			label: "Ocupação",
			value: `${occupancyAvg}%`,
			helper: "média do dia",
		},
		{
			label: "A receber",
			value: formatCurrency(pendingRevenue),
			helper: `${pendingBookingsCount} pendência(s)`,
		},
		{
			label: "Mês",
			value: formatCurrency(revenueMonth),
			helper: "receita acumulada",
		},
	];

	return (
		<section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_16px_46px_-38px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-[#101823]/95">
			<div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)] xl:items-center">
				<div className="flex items-start gap-3">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0b71ee] ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20">
						<Calendar className="h-5 w-5" />
					</div>
					<div className="min-w-0">
						<p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
							Status do dia
						</p>
						<h3 className="mt-1 truncate text-xl font-black tracking-tight text-[#062b6f] dark:text-white">
							{statusTitle}
						</h3>
						<p className="mt-1 text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">
							{statusDescription}
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							<Button
								type="button"
								onClick={onOpenAgenda}
								className="h-9 rounded-md bg-[#0b71ee] px-3 text-xs font-black text-white hover:bg-[#0861cd]">
								<Calendar className="mr-2 h-3.5 w-3.5" />
								Abrir agenda
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={onOpenFinanceiro}
								className="h-9 rounded-md border-slate-200 bg-white px-3 text-xs font-black text-[#062b6f] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
								Caixa
							</Button>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2 md:grid-cols-5">
					{metricItems.map((item) => (
						<div
							key={item.label}
							className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
							<p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
								{item.label}
							</p>
							<p className="mt-1 truncate text-lg font-black tabular-nums text-[#062b6f] dark:text-white">
								{item.value}
							</p>
							<p className="mt-0.5 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
								{item.helper}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

const TodayTimeline = ({
	rows,
	onOpenAgenda,
}: {
	rows: CourtTimelineRow[];
	onOpenAgenda: () => void;
}) => {
	const slotClass = (status: CourtTimelineSlot["status"]) =>
		status === "paid" ?
			"border-[color:var(--az-line)] bg-[color:var(--az-turf)] text-white"
		: status === "pending" ?
			"border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-clay)]"
		: status === "blocked" ?
			"border-[color:var(--az-line)] bg-[color:var(--az-paper)] text-[color:var(--az-ink-soft)]"
		: "border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-turf)] hover:bg-[color:var(--az-navy-soft)] hover:text-[color:var(--az-navy)]";
	const statusLabel = (slot: CourtTimelineSlot) =>
		slot.status === "available" ? "Livre"
		: slot.status === "blocked" ? "Bloq."
		: slot.customerName?.split(" ")[0] || "Reserva";
	const hasBookedSlot = rows.some((row) =>
		row.slots.some((slot) => slot.status === "paid" || slot.status === "pending"),
	);
	const availableCount = rows.reduce(
		(count, row) =>
			count + row.slots.filter((slot) => slot.status === "available").length,
		0,
	);

	return (
		<Card className="rounded-[var(--az-radius-card)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] shadow-none">
			<CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle className="font-['Archivo'] text-[20px] font-semibold tracking-normal text-[color:var(--az-ink)]">
						Grade de hoje
					</CardTitle>
					<p className="mt-1 text-[13px] text-[color:var(--az-ink-soft)]">
						Quadras, horários e ocupação em uma única leitura.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={onOpenAgenda}
					className="h-9 rounded-[var(--az-radius-control)] border-[0.5px] border-[color:var(--az-line)] bg-transparent text-xs font-medium text-[color:var(--az-ink)] hover:bg-[color:var(--az-navy-soft)]">
					Ver agenda
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				{rows.length === 0 ?
					<div className="rounded-[var(--az-radius-card)] border-[0.5px] border-dashed border-[color:var(--az-line)] p-6 text-center">
						<p className="text-[15px] font-medium text-[color:var(--az-ink)]">
							Nenhuma quadra configurada ainda.
						</p>
						<p className="mt-1 text-[13px] text-[color:var(--az-ink-soft)]">
							Configure as quadras para preencher a linha do tempo.
						</p>
					</div>
				:	<>
						{!hasBookedSlot && (
							<div className="flex flex-col gap-3 rounded-[var(--az-radius-card)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-navy-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="text-[15px] font-medium text-[color:var(--az-ink)]">
										Dia ainda sem reservas
									</p>
									<p className="mt-1 text-[13px] leading-5 text-[color:var(--az-ink-soft)]">
										{availableCount} janelas aparecem livres neste recorte. Comece
										pelo melhor horário e mantenha a leitura limpa.
									</p>
								</div>
								<Button
									type="button"
									onClick={onOpenAgenda}
									className="h-9 rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] px-3 text-xs font-medium text-white hover:bg-[color:var(--az-navy)]">
									Criar reserva
								</Button>
							</div>
						)}

						<div className="space-y-3">
							{rows.map((row) => (
								<div
									key={row.courtId}
									className="grid gap-3 rounded-[var(--az-radius-card)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] p-3 md:grid-cols-[140px_minmax(0,1fr)]">
									<div className="flex items-center justify-between gap-3 md:block">
										<p className="truncate text-[14px] font-medium text-[color:var(--az-ink)]">
											{row.courtName}
										</p>
										<div className="mt-1 flex items-center gap-2">
											<div className="h-1.5 w-16 overflow-hidden rounded-full bg-[color:var(--az-line)]">
												<div
													className="h-full rounded-full bg-[color:var(--az-turf)]"
													style={{ width: `${Math.min(100, row.occupancy)}%` }}
												/>
											</div>
											<p className="text-xs font-medium tabular-nums text-[color:var(--az-ink-soft)]">
												{row.occupancy}%
											</p>
										</div>
									</div>
									<div className="grid grid-cols-[repeat(6,minmax(84px,1fr))] gap-2 overflow-x-auto pb-1">
										{row.slots.map((slot) => (
											<button
												type="button"
												onClick={slot.status === "available" ? onOpenAgenda : undefined}
												key={`${row.courtId}-${slot.time}`}
												className={cn(
													"min-h-[64px] rounded-[var(--az-radius-control)] border-[0.5px] px-2.5 py-2 text-left transition-colors",
													slotClass(slot.status),
												)}>
												<p className="text-xs font-medium tabular-nums">
													{slot.time}
												</p>
												<p className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium opacity-90">
													{slot.status === "available" && <Plus className="h-3 w-3" />}
													<span>{statusLabel(slot)}</span>
												</p>
											</button>
										))}
									</div>
								</div>
							))}
						</div>
					</>
				}
			</CardContent>
		</Card>
	);
};

const OperationalAlertsPanel = ({ alerts }: { alerts: OperationalAlert[] }) => {
	const toneClass = (tone: OperationalAlert["tone"]) =>
		tone === "red" ? "border-red-200 bg-red-50/70 text-red-700"
		: tone === "yellow" ?
			"border-yellow-200 bg-yellow-50/70 text-yellow-800"
		: tone === "green" ?
			"border-emerald-200 bg-emerald-50/70 text-emerald-700"
		: "border-blue-100 bg-blue-50/70 text-[#0b71ee]";

	return (
		<Card className="rounded-lg border-slate-200 bg-white shadow-[0_12px_36px_-32px_rgba(2,6,23,0.55)] dark:border-white/10 dark:bg-[#101823]/95">
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-black text-[#062b6f] dark:text-white">
					Prioridades
				</CardTitle>
				<p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
					Somente o que precisa de decisão no turno.
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				{alerts.map((alert) => (
					<div
						key={alert.id}
						className={cn("rounded-lg border p-3", toneClass(alert.tone))}>
						<div className="flex items-start gap-3">
							<div className="mt-0.5 h-2 w-2 rounded-full bg-current" />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-black">{alert.title}</p>
								<p className="mt-1 text-xs font-semibold leading-5 opacity-80">
									{alert.description}
								</p>
								{alert.actionLabel && alert.onClick && (
									<button
										type="button"
										onClick={alert.onClick}
										className="mt-2 text-xs font-black underline-offset-4 hover:underline">
										{alert.actionLabel}
									</button>
								)}
							</div>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
};

const WeeklyPerformanceCard = ({
	chartData,
	chartHasNoData,
	onOpenAgenda,
	onOpenFinanceiro,
}: {
	chartData: Array<{ day: string; value: number; date: string }>;
	chartHasNoData: boolean;
	onOpenAgenda: () => void;
	onOpenFinanceiro: () => void;
}) => (
	<Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-[0_12px_36px_-32px_rgba(2,6,23,0.55)] dark:border-white/10 dark:bg-[#101823]/95">
		<CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<CardTitle className="flex items-center gap-2 text-base font-black text-[#062b6f] dark:text-slate-100">
					<Activity className="h-4 w-4 text-[#0b71ee] dark:text-blue-300" />
					Performance da semana
				</CardTitle>
				<p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
					Receita por dia para detectar pico, queda e oportunidade.
				</p>
			</div>
			<Button
				type="button"
				variant="outline"
				onClick={onOpenFinanceiro}
				className="rounded-md border-slate-200 bg-white text-xs font-black text-[#062b6f] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
				Ver financeiro
			</Button>
		</CardHeader>
		<CardContent className="h-[230px] px-2 sm:px-4">
			{chartHasNoData && (
				<div className="flex h-full flex-col items-center justify-center text-center">
					<div className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
						<Activity className="h-6 w-6 text-[#0b71ee] dark:text-blue-300" />
					</div>
					<p className="mb-1 text-sm font-black text-[#062b6f] dark:text-slate-200">
						Dados entram conforme reservas forem confirmadas.
					</p>
					<button
						type="button"
						onClick={onOpenAgenda}
						className="mt-2 rounded-md bg-[#0b71ee] px-4 py-2 text-xs font-black text-white transition-colors hover:bg-[#0861cd]">
						Criar reserva
					</button>
				</div>
			)}
			{!chartHasNoData && (
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={chartData}
						margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
						<defs>
							<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#0b71ee" stopOpacity={0.24} />
								<stop offset="95%" stopColor="#0b71ee" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid stroke="rgba(15,23,42,0.08)" vertical={false} />
						<XAxis
							dataKey="day"
							axisLine={false}
							tickLine={false}
							tick={{ fill: "#64748b", fontSize: 10 }}
							height={35}
							interval={0}
							padding={{ left: 5, right: 5 }}
						/>
						<RechartsTooltip
							contentStyle={{
								backgroundColor: "#ffffff",
								borderRadius: "8px",
								border: "1px solid rgba(148,163,184,0.35)",
								boxShadow: "0 14px 36px rgba(15,23,42,0.14)",
								padding: "10px 14px",
							}}
							labelStyle={{ color: "#0f172a", fontWeight: 800 }}
							itemStyle={{ color: "#0b71ee", fontWeight: 800 }}
							formatter={(value: number | string) => {
								const n = typeof value === "number" ? value : Number(value);
								return [
									formatCurrency(Number.isFinite(n) ? n : 0),
									"Receita",
								];
							}}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke="#0b71ee"
							strokeWidth={3}
							fill="url(#grad)"
							animationDuration={1600}
							animationEasing="ease-out"
						/>
					</AreaChart>
				</ResponsiveContainer>
			)}
		</CardContent>
	</Card>
);

// --- TELA PRINCIPAL (Layout Controller) ---
export default function DashboardHome() {
	const { bookings, timeSlots, loading } = useBookings();
	const { resolvedTheme } = useTheme();
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
	}, [activeView, searchParams]);

	// Removido: Logs excessivos estavam causando poluição no console
	const { toast } = useToast();
	const { tenantId, userProfile } = useAuth();
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
		const nowMinutes = today.getHours() * 60 + today.getMinutes();
		const lastWeekSameDay = new Date(today);
		lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
		const lastWeekSameDayStr = formatLocalDate(lastWeekSameDay);
		// Inclui todos os jogos de hoje (exceto cancelados)
		const todayBookings = bookings
			.filter((b) => b.date === todayStr && b.status !== "cancelled")
			.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
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

		const pendingRevenue = todayBookings.reduce((acc, b) => {
			if (b.paymentStatus === "paid") return acc;
			const total = b.totalPrice || 0;
			const paid = b.paidAmount || 0;
			const remaining = Math.max(0, total - paid);
			return acc + remaining;
		}, 0);

		const pendingBookings: DashboardBookingSummary[] = todayBookings
			.map((b) => ({
				id: b.id,
				time: b.time,
				fieldName: b.fieldName,
				customerName: b.customerName,
				totalPrice: b.totalPrice || 0,
				paidAmount: b.paidAmount || 0,
				remaining:
					b.paymentStatus === "paid" ?
						0
					:	Math.max(0, (b.totalPrice || 0) - (b.paidAmount || 0)),
				paymentStatus: b.paymentStatus,
			}))
			.filter((b) => b.remaining > 0);

		const nextBookingSource = todayBookings.find(
			(b) => timeToMinutes(b.time) >= nowMinutes,
		);
		const nextBooking: DashboardBookingSummary | undefined =
			nextBookingSource ?
				{
					id: nextBookingSource.id,
					time: nextBookingSource.time,
					fieldName: nextBookingSource.fieldName,
					customerName: nextBookingSource.customerName,
					totalPrice: nextBookingSource.totalPrice || 0,
					paidAmount: nextBookingSource.paidAmount || 0,
					remaining:
						nextBookingSource.paymentStatus === "paid" ?
							0
						:	Math.max(
								0,
								(nextBookingSource.totalPrice || 0) -
									(nextBookingSource.paidAmount || 0),
							),
					paymentStatus: nextBookingSource.paymentStatus,
				}
			:	undefined;

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

		const todaySlots = timeSlots.filter((slot) => slot.date === todayStr);
		const totalCourts = uniqueCourts.length;
		const currentBookings = todayBookings.filter((booking) => {
			const start = timeToMinutes(booking.time);
			const end =
				booking.endTime ?
					booking.endTime.getHours() * 60 + booking.endTime.getMinutes()
				:	start + 60;
			return start <= nowMinutes && end > nowMinutes;
		});
		const occupiedCourtIds = new Set(currentBookings.map((b) => b.fieldId));
		const occupiedNow = occupiedCourtIds.size;
		const availableNow = Math.max(0, totalCourts - occupiedNow);
		const occupancyAvg = Math.round(
			courtsStats.reduce((acc, c) => acc + c.occupancy, 0) /
				(courtsStats.length || 1),
		);

		const primeOpenSlot =
			todaySlots
				.filter((slot) => {
					const minutes = timeToMinutes(slot.time);
					return (
						slot.status === "available" &&
						minutes >= Math.max(nowMinutes, 18 * 60) &&
						minutes <= 22 * 60
					);
				})
				.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))[0] ||
			todaySlots
				.filter(
					(slot) =>
						slot.status === "available" &&
						timeToMinutes(slot.time) >= nowMinutes,
				)
				.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))[0];

		const uniqueTimes = Array.from(new Set(todaySlots.map((slot) => slot.time))).sort(
			(a, b) => timeToMinutes(a) - timeToMinutes(b),
		);
		const nextTimeIndex = uniqueTimes.findIndex(
			(time) => timeToMinutes(time) >= nowMinutes,
		);
		const baseTimelineIndex =
			nextTimeIndex === -1 ?
				Math.max(0, uniqueTimes.length - 6)
			:	Math.max(0, nextTimeIndex - 1);
		const timelineTimes = uniqueTimes.slice(baseTimelineIndex, baseTimelineIndex + 6);
		const timelineWindow =
			timelineTimes.length >= 4 ? timelineTimes
			: uniqueTimes.length > 0 ? uniqueTimes.slice(0, 6)
			: [];
		const bookingByCourtAndTime = new Map(
			todayBookings.map((booking) => [
				`${booking.fieldId}-${booking.time}`,
				booking,
			]),
		);
		const timelineRows: CourtTimelineRow[] = courtsStats.slice(0, 5).map((court) => ({
			courtId: court.id,
			courtName: court.name,
			occupancy: court.occupancy,
			slots: timelineWindow.map((time) => {
				const slot = todaySlots.find(
					(s) => s.fieldId === court.id && s.time === time,
				);
				const booking = bookingByCourtAndTime.get(`${court.id}-${time}`);
				return {
					time,
					status:
						slot?.status === "blocked" ? "blocked"
						: booking ?
							booking.paymentStatus === "paid" ? "paid"
							: "pending"
						: "available",
					customerName: booking?.customerName,
				};
			}),
		}));

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
			pendingRevenue,
			pendingBookings,
			gamesToday: todayBookings.length,
			nextBooking,
			primeOpenSlot:
				primeOpenSlot ?
					{ time: primeOpenSlot.time, courtName: primeOpenSlot.courtName }
				:	undefined,
			occupiedNow,
			availableNow,
			totalCourts,
			occupancyAvg,
			chartData,
			chartHasNoData,
			courtsStats,
			timelineRows,
			trendToday,
		};
	}, [bookings, timeSlots]);

	const operationalAlerts = useMemo<OperationalAlert[]>(() => {
		const alerts: OperationalAlert[] = [];
		const firstPending = stats.pendingBookings[0];

		if (firstPending) {
			alerts.push({
				id: "pending-payments",
				title: `${stats.pendingBookings.length} pagamento(s) pendente(s)`,
				description: `${firstPending.customerName} tem ${formatCurrency(firstPending.remaining)} em aberto às ${firstPending.time}.`,
				tone: "yellow",
				actionLabel: "Abrir agenda",
				onClick: () => setActiveView("agenda"),
			});
		}

		if (!stats.nextBooking && stats.gamesToday === 0) {
			alerts.push({
				id: "empty-day",
				title: "Dia ainda sem reservas",
				description:
					"Cadastre reservas locais ou compartilhe o link público para movimentar a agenda.",
				tone: "blue",
				actionLabel: "Abrir agenda",
				onClick: () => setActiveView("agenda"),
			});
		}

		if (stats.gamesToday > 0 && stats.primeOpenSlot) {
			alerts.push({
				id: "prime-open-slot",
				title: "Horário livre para vender",
				description: `${stats.primeOpenSlot.courtName || "Uma quadra"} está livre às ${stats.primeOpenSlot.time}.`,
				tone: "blue",
				actionLabel: "Criar reserva",
				onClick: () => setActiveView("agenda"),
			});
		}

		if (alerts.length === 0) {
			alerts.push({
				id: "healthy-operation",
				title: "Operação sem pendências críticas",
				description:
					"Agenda, ocupação e recebimentos do dia não exigem ação imediata.",
				tone: "green",
			});
		}

		return alerts.slice(0, 3);
	}, [
		stats.gamesToday,
		stats.nextBooking,
		stats.pendingBookings,
		stats.primeOpenSlot,
	]);

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
							Ao clicar em “Começar trial”, ele é iniciado agora e termina em 7
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
					"Pagamento no local ou via WhatsApp",
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
						<section className="rounded-xl bg-[#101823] border border-white/15 p-6 space-y-3 shadow-sm">
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
									<span className="uppercase tracking-[0.4em] text-blue-200">
										Parcelamento
									</span>
									<strong className="text-lg text-white">até 12x*</strong>
								</div>
								<div className="flex flex-col">
									<span className="uppercase tracking-[0.4em] text-blue-200">
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
												"rounded-xl border p-5 space-y-4 transition-all",
												isActive ?
													"border-blue-400 bg-blue-500/10 shadow-sm"
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
													<span className="rounded-full bg-blue-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-200">
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
																"border-blue-400 bg-blue-500/10 text-white"
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
														<span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
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
										<p className="text-xs uppercase tracking-[0.4em] text-blue-300">
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

	const isLightTheme = resolvedTheme !== "dark";

	return (
		<div
			className={cn(
				"min-h-screen font-sans selection:bg-[color:var(--az-navy-soft)] selection:text-[color:var(--az-navy)] relative overflow-hidden transition-colors duration-300",
				isLightTheme ?
					"dashboard-light bg-[color:var(--az-paper)] text-[color:var(--az-ink)]"
				:	"dashboard-dark bg-[color:var(--az-paper)] text-[color:var(--az-ink)]",
			)}>
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
					collapsed ? "md:pl-20" : "md:pl-[236px]",
				)}>
				{/* Header Mobile */}
				<div className="sticky top-0 z-30 flex items-center justify-between border-b-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] px-4 py-3 md:hidden">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] text-white">
							<Activity className="h-4 w-4" />
						</div>
						<span className="text-lg font-semibold tracking-normal text-[color:var(--az-ink)]">
							ArenaSys
						</span>
					</div>
					<div className="flex items-center gap-2">
						<ThemeToggleButton collapsed />
						<Button
							variant="ghost"
							size="icon"
							aria-label="Abrir menu"
							className="text-[color:var(--az-ink-soft)] hover:bg-[color:var(--az-navy-soft)] hover:text-[color:var(--az-ink)]"
							onClick={() => setMobileOpen(true)}>
							<Menu className="w-6 h-6" />
						</Button>
					</div>
				</div>

				<main
					data-dashboard
					className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
					{activeView === "dashboard" && (
						<div className="space-y-5">
							<DashboardTopbar
								userName={userProfile?.full_name}
								onOpenAgenda={() => setActiveView("agenda")}
								onOpenFinanceiro={() => setActiveView("financeiro")}
							/>

							<TodayTimeline
								rows={stats.timelineRows}
								onOpenAgenda={() => setActiveView("agenda")}
							/>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<AdminMetric
									label="Caixa do dia"
									value={formatCurrency(stats.revenueToday)}
									tone="turf"
									icon={<BarChart className="h-4 w-4" />}
								/>
								<AdminMetric
									label="Receita do mês"
									value={formatCurrency(stats.revenueMonth)}
									tone="muted"
									icon={<Activity className="h-4 w-4" />}
								/>
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
