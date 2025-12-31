import { useState, useMemo } from "react";
import AgendaMaster from "./AgendaMaster";
import FinanceiroView from "./FinanceiroView";
import ConfiguracoesView from "./ConfiguracoesView";
import FolgasView from "./FolgasView";
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
	Megaphone,
	Share2,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	Tooltip,
	CartesianGrid,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/contexts/BookingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// --- HELPERS (Formatadores) ---
const formatCurrency = (value: number) =>
	value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateShort = (dateStr: string) => {
	const date = new Date(dateStr);
	const utcDate = new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate()
	);
	return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
		.format(utcDate)
		.replace(".", "");
};

const getLast7Days = () => {
	const days = [];
	for (let i = 6; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		days.push(d.toISOString().split("T")[0]);
	}
	return days;
};

// --- COMPONENTE: SIDEBAR PROFISSIONAL (A "Alma" do Layout) ---
const SidebarFixed = ({
	mobileOpen,
	setMobileOpen,
	collapsed,
	setCollapsed,
	activeView,
	setActiveView,
}: any) => {
	const { userProfile, signOut } = useAuth();
	const { toast } = useToast();

	const handleShare = async () => {
		const shareData = {
			title: "Agende na Arena Sports",
			text: `Venha jogar na ${userProfile?.tenant_id || "minha arena"}!`,
			url: window.location.origin + "/agendar",
		};

		try {
			if (navigator.share) {
				await navigator.share(shareData);
			} else {
				await navigator.clipboard.writeText(shareData.url);
				toast({
					title: "Link copiado!",
					description: "Cole no WhatsApp para divulgar.",
				});
			}
		} catch (err) {
			console.log("Compartilhamento cancelado");
		}
	};

	const menuItems = [
		{ id: "dashboard", icon: Home, label: "Visão Geral" },
		{ id: "agenda", icon: Calendar, label: "Agenda Master" },
		{ id: "financeiro", icon: BarChart, label: "Financeiro" },
		{ id: "folgas", icon: Clock, label: "Gerenciar Folgas" },
	];

	return (
		<>
			<div
				className={cn(
					"fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 md:hidden",
					mobileOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				)}
				onClick={() => setMobileOpen(false)}
			/>

			<aside
				className={cn(
					"fixed top-0 left-0 z-50 h-full bg-[#050507]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-out shadow-2xl flex flex-col",
					mobileOpen
						? "translate-x-0 w-72"
						: "-translate-x-full md:translate-x-0",
					collapsed ? "md:w-20" : "md:w-72"
				)}>
				<div
					className={cn(
						"flex items-center h-20 border-b border-white/5",
						collapsed ? "justify-center px-0" : "justify-between px-6"
					)}>
					{!collapsed && (
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
								<Activity className="text-emerald-400 h-5 w-5" />
							</div>
							<div>
								<h1 className="text-base font-bold text-white leading-none tracking-tight">
									Arena OS
								</h1>
								<p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">
									Gestão Pro
								</p>
							</div>
						</div>
					)}
					{collapsed && <Activity className="text-emerald-400 h-6 w-6" />}

					<button
						onClick={() => setCollapsed(!collapsed)}
						className="hidden md:flex text-gray-500 hover:text-white transition-colors p-1"
						title={collapsed ? "Expandir" : "Recolher"}>
						{collapsed ? (
							<ChevronRight className="h-5 w-5" />
						) : (
							<ChevronLeft className="h-5 w-5" />
						)}
					</button>
					<button
						onClick={() => setMobileOpen(false)}
						className="md:hidden text-gray-400">
						<X className="h-6 w-6" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
					<button
						onClick={handleShare}
						className={cn(
							"w-full flex items-center gap-3 px-3 py-3 mb-6 rounded-xl transition-all duration-300 group relative overflow-hidden",
							"bg-gradient-to-r from-emerald-500 to-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95",
							collapsed ? "justify-center px-0" : ""
						)}
						title="Divulgar Arena">
						{collapsed ? (
							<Share2 className="h-5 w-5" />
						) : (
							<Megaphone className="h-5 w-5 fill-white/20" />
						)}
						{!collapsed && (
							<span className="text-sm font-bold tracking-wide">
								Divulgar Arena
							</span>
						)}
					</button>

					{menuItems.map((item) => (
						<button
							key={item.id}
							onClick={() => {
								setActiveView(item.id);
								setMobileOpen(false);
							}}
							className={cn(
								"w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
								activeView === item.id
									? "bg-white/10 text-white font-medium"
									: "text-gray-400 hover:bg-white/5 hover:text-white",
								collapsed ? "justify-center" : ""
							)}
							title={collapsed ? item.label : ""}>
							<item.icon
								className={cn(
									"h-5 w-5 shrink-0 transition-colors",
									activeView === item.id
										? "text-emerald-400"
										: "group-hover:text-white"
								)}
							/>
							{!collapsed && <span className="text-sm">{item.label}</span>}
							{!collapsed && activeView === item.id && (
								<div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
							)}
						</button>
					))}
				</div>

				<div className="p-3 border-t border-white/5 bg-black/20 backdrop-blur-md">
					<button
						onClick={() => {
							setActiveView("config");
							setMobileOpen(false);
						}}
						className={cn(
							"w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:bg-white/5 hover:text-white mb-2",
							activeView === "config" && "bg-white/5 text-white",
							collapsed ? "justify-center" : ""
						)}
						title="Configurações">
						<Settings className="h-5 w-5 shrink-0" />
						{!collapsed && <span className="text-sm">Configurações</span>}
					</button>

					<div
						className={cn(
							"flex items-center gap-3 p-2 rounded-xl border border-white/5 bg-white/5 mt-2",
							collapsed ? "justify-center border-none bg-transparent p-0" : ""
						)}>
						<div className="h-9 w-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
							{userProfile?.avatar_url ? (
								<img
									src={userProfile.avatar_url}
									alt="User"
									className="h-full w-full object-cover"
								/>
							) : (
								<User className="text-white h-4 w-4" />
							)}
						</div>
						{!collapsed && (
							<div className="flex-1 overflow-hidden">
								<p className="text-sm font-medium text-white truncate">
									{userProfile?.full_name?.split(" ")[0] || "Admin"}
								</p>
								<p className="text-[10px] text-gray-500 uppercase font-bold truncate">
									Logado
								</p>
							</div>
						)}
						{!collapsed && (
							<button
								onClick={async () => {
									if (signOut) {
										await signOut();
										window.location.href = "/login";
									}
								}}
								className="text-gray-500 hover:text-red-400 transition-colors p-1">
								<LogOut className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>
			</aside>
		</>
	);
};

// --- COMPONENTES VISUAIS (Dashboard) ---
const ArenaStatusHero = ({ revenueToday, occupancyAvg, nextPeak }: any) => {
	const statusConfig =
		occupancyAvg > 80
			? {
					color: "bg-yellow-500",
					text: "Alta demanda",
					glow: "shadow-yellow-500/10",
			  }
			: occupancyAvg > 20
			? {
					color: "bg-emerald-500",
					text: "Arena Operando Bem",
					glow: "shadow-emerald-500/10",
			  }
			: {
					color: "bg-gray-500",
					text: "Movimento Tranquilo",
					glow: "shadow-gray-500/10",
			  };

	return (
		<div
			className={`relative overflow-hidden rounded-3xl bg-[#0F1115]/80 border border-white/5 p-6 shadow-xl backdrop-blur-md ${statusConfig.glow}`}>
			{/* Glow Effect Topo */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

			<div className="relative z-10 flex flex-col items-center text-center space-y-3">
				<div className="inline-flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
					<span
						className={`h-2 w-2 rounded-full ${statusConfig.color} animate-pulse`}
					/>
					<h2 className="text-sm font-medium text-white">
						{statusConfig.text}
					</h2>
				</div>
				<div className="flex gap-8 text-sm text-gray-400 mt-1">
					<div className="flex flex-col">
						<span className="text-[10px] uppercase tracking-wider text-gray-600 font-bold">
							Hoje
						</span>
						<span className="text-white font-bold text-xl">
							{formatCurrency(revenueToday)}
						</span>
					</div>
					<div className="w-[1px] bg-white/10" />
					<div className="flex flex-col">
						<span className="text-[10px] uppercase tracking-wider text-gray-600 font-bold">
							Ocupação
						</span>
						<span className="text-white font-bold text-xl">
							{occupancyAvg}%
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

const MetricPill = ({ label, value, icon: Icon }: any) => (
	<div className="flex flex-col p-4 rounded-2xl bg-[#0F1115]/80 border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all backdrop-blur-md group">
		<div className="flex justify-between items-start mb-2">
			<span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-400 transition-colors">
				{label}
			</span>
			{Icon && (
				<Icon className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
			)}
		</div>
		<span className="text-xl font-bold text-white tracking-tight">{value}</span>
	</div>
);

// --- TELA PRINCIPAL (Layout Controller) ---
export default function DashboardHome() {
	const { bookings, timeSlots, loading } = useBookings();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [activeView, setActiveView] = useState("dashboard");

	const stats = useMemo(() => {
		// Mesma lógica de sempre...
		const todayStr = new Date().toISOString().split("T")[0];
		const todayBookings = bookings.filter((b) => b.date === todayStr);
		const monthBookings = bookings.filter((b) => {
			const d = new Date(b.date + "T00:00:00");
			const now = new Date();
			return (
				d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
			);
		});

		const revenueToday = todayBookings
			.filter((b) => b.paymentStatus === "paid")
			.reduce((acc, b) => acc + (b.totalPrice || 0), 0);
		const revenueMonth = monthBookings
			.filter((b) => b.paymentStatus === "paid")
			.reduce((acc, b) => acc + (b.totalPrice || 0), 0);

		const chartData = getLast7Days().map((dateStr) => {
			const total = bookings
				.filter((b) => b.date === dateStr && b.paymentStatus === "paid")
				.reduce((acc, b) => acc + (b.totalPrice || 0), 0);
			return { day: formatDateShort(dateStr), value: total };
		});

		const uniqueCourts = Array.from(
			new Set(
				timeSlots.map((s) =>
					JSON.stringify({ id: s.fieldId, name: s.courtName })
				)
			)
		).map((s) => JSON.parse(s));
		const courtsStats = uniqueCourts.map((court) => {
			const slots = timeSlots.filter((s) => s.fieldId === court.id);
			const available = slots.filter((s) => s.status === "available");
			const occupancy = slots.length
				? Math.round(((slots.length - available.length) / slots.length) * 100)
				: 0;
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

		return {
			revenueToday,
			revenueMonth,
			gamesToday: todayBookings.length,
			chartData,
			courtsStats,
		};
	}, [bookings, timeSlots]);

	const occupancyAvg = Math.round(
		stats.courtsStats.reduce((acc, c) => acc + c.occupancy, 0) /
			(stats.courtsStats.length || 1)
	);
	const focusCourt = stats.courtsStats[0];

	if (loading)
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Activity className="w-10 h-10 text-emerald-500 animate-spin" />
					<p className="text-gray-500 text-sm animate-pulse">
						Carregando Arena OS...
					</p>
				</div>
			</div>
		);

	return (
		<div className="min-h-screen bg-[#02040a] text-white font-sans selection:bg-emerald-500/30 relative overflow-hidden">
			{/* Background Noise & Gradient (Igual ao Login) */}
			<div className="absolute inset-0 z-0 pointer-events-none">
				<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
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
			/>

			<div
				className={cn(
					"relative z-10 flex flex-col min-h-screen transition-all duration-300 ease-out",
					collapsed ? "md:pl-20" : "md:pl-72"
				)}>
				{/* Header Mobile */}
				<div className="md:hidden sticky top-0 z-30 bg-[#02040a]/80 backdrop-blur-lg border-b border-white/5 px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5 text-emerald-500" />
						<span className="font-bold text-lg tracking-tight">Arena OS</span>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setMobileOpen(true)}>
						<Menu className="w-6 h-6 text-white" />
					</Button>
				</div>

				<main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
					{activeView === "dashboard" && (
						<div className="space-y-6">
							<ArenaStatusHero
								revenueToday={stats.revenueToday}
								occupancyAvg={occupancyAvg}
								nextPeak="19:00 — 21:00"
							/>

							<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
								<MetricPill
									label="Hoje"
									value={formatCurrency(stats.revenueToday)}
									icon={TrendingUp}
								/>
								<MetricPill
									label="Mês"
									value={formatCurrency(stats.revenueMonth)}
									icon={Calendar}
								/>
								<MetricPill
									label="Jogos"
									value={stats.gamesToday.toString()}
									icon={Trophy}
								/>
								<MetricPill
									label="Ocupação"
									value={`${occupancyAvg}%`}
									icon={User}
								/>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<Card className="lg:col-span-2 bg-[#0F1115]/80 border border-white/5 rounded-3xl overflow-hidden shadow-lg backdrop-blur-md">
									<CardHeader>
										<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
											<Activity className="w-4 h-4 text-emerald-500" />{" "}
											Performance da Semana
										</CardTitle>
									</CardHeader>
									<CardContent className="h-[250px] -ml-4">
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart data={stats.chartData}>
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
													tick={{ fill: "#666", fontSize: 12 }}
													dy={10}
												/>
												<Tooltip
													contentStyle={{
														backgroundColor: "#18181b",
														borderRadius: "12px",
														border: "1px solid #333",
													}}
													itemStyle={{ color: "#fff" }}
													formatter={(v: any) => [formatCurrency(v), "Receita"]}
												/>
												<Area
													type="monotone"
													dataKey="value"
													stroke="#10b981"
													strokeWidth={3}
													fill="url(#grad)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									</CardContent>
								</Card>

								{focusCourt && (
									<Card className="bg-[#0F1115]/80 border border-white/5 rounded-3xl relative overflow-hidden group backdrop-blur-md">
										<CardContent className="p-6 flex flex-col justify-between h-full">
											<div>
												<div className="flex justify-between items-start mb-4">
													<span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
														Destaque
													</span>
													<Trophy className="w-5 h-5 text-gray-600" />
												</div>
												<h3 className="text-xl font-bold text-white mb-1">
													{focusCourt.name}
												</h3>
												<p className="text-sm text-gray-500">
													Ocupação:{" "}
													<span className="text-white font-bold">
														{focusCourt.occupancy}%
													</span>
												</p>
											</div>
											<div className="mt-4 pt-4 border-t border-white/5">
												<p className="text-[10px] text-gray-500 uppercase mb-1">
													Próximo Livre
												</p>
												<p className="text-2xl font-mono text-white tracking-tighter">
													{focusCourt.nextFree}
												</p>
											</div>
										</CardContent>
									</Card>
								)}
							</div>
						</div>
					)}

					{activeView === "agenda" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
							<AgendaMaster />
						</div>
					)}
					{activeView === "financeiro" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
							<FinanceiroView />
						</div>
					)}
					{activeView === "folgas" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
							<FolgasView />
						</div>
					)}
					{activeView === "config" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
							<ConfiguracoesView />
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
