import { useState, useMemo } from "react";
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	Minus,
	Calendar,
	Users,
	BarChart3,
	Download,
	CreditCard,
	Banknote,
	Clock,
	CheckCircle2,
	AlertCircle,
	Zap,
	ChevronRight,
	Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useBookings } from "@/contexts/BookingsContext";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatCardSkeleton } from "@/components/admin/StatCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

type FinanceiroViewProps = {
	onNavigateToAgenda?: () => void;
};

export default function FinanceiroView({
	onNavigateToAgenda,
}: FinanceiroViewProps) {
	const { bookings, timeSlots, loading } = useBookings(); // Assumindo que 'loading' existe
	const [selectedMonth, setSelectedMonth] = useState(() => {
		return format(new Date(), "yyyy-MM");
	});

	// Calculate financial metrics
	const metrics = useMemo(() => {
		const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
		const monthEnd = endOfMonth(new Date(selectedMonth + "-01"));

		const confirmedBookings = bookings.filter((booking) => {
			if (booking.status === "cancelled") return false;
			if (
				booking.status !== "confirmed" &&
				booking.status !== "pending_approval"
			)
				return false;
			const bookingDate = new Date(booking.date);
			return isWithinInterval(bookingDate, {
				start: monthStart,
				end: monthEnd,
			});
		});

		const totalRevenue = confirmedBookings.reduce(
			(sum, booking) => sum + (booking.totalPrice ?? 0),
			0,
		);
		const totalBookings = confirmedBookings.length;
		const totalSlots = timeSlots.filter((slot) => {
			const slotDate = new Date(slot.date);
			return isWithinInterval(slotDate, { start: monthStart, end: monthEnd });
		}).length;

		const occupancyRate =
			totalSlots > 0 ? (totalBookings / totalSlots) * 100 : 0;

		// Group by day for chart
		const revenueByDay: { [key: string]: number } = {};
		confirmedBookings.forEach((booking) => {
			const day = booking.date;
			const revenue = booking.totalPrice ?? 0;
			revenueByDay[day] = (revenueByDay[day] || 0) + revenue;
		});

		// Get unique players
		const uniquePlayers = new Set(
			confirmedBookings.map((booking) => booking.bookedBy).filter(Boolean),
		);

		// Separate paid vs pending bookings (simulated based on status)
		const paidBookings = confirmedBookings.filter(
			(b) => b.status === "confirmed",
		);
		const pendingBookings = confirmedBookings.filter(
			(b) => b.status === "pending_approval",
		);

		const paidRevenue = paidBookings.reduce(
			(sum, b) => sum + (b.totalPrice ?? 0),
			0,
		);
		const pendingRevenue = pendingBookings.reduce(
			(sum, b) => sum + (b.totalPrice ?? 0),
			0,
		);

		// Calculate previous month metrics for comparison
		const prevMonthStart = startOfMonth(
			new Date(
				new Date(selectedMonth + "-01").setMonth(
					new Date(selectedMonth + "-01").getMonth() - 1,
				),
			),
		);
		const prevMonthEnd = endOfMonth(
			new Date(
				new Date(selectedMonth + "-01").setMonth(
					new Date(selectedMonth + "-01").getMonth() - 1,
				),
			),
		);

		const prevMonthBookings = bookings.filter((booking) => {
			if (booking.status === "cancelled") return false;
			if (
				booking.status !== "confirmed" &&
				booking.status !== "pending_approval"
			)
				return false;
			const bookingDate = new Date(booking.date);
			return isWithinInterval(bookingDate, {
				start: prevMonthStart,
				end: prevMonthEnd,
			});
		});

		const prevRevenue = prevMonthBookings.reduce(
			(sum, booking) => sum + (booking.totalPrice ?? 0),
			0,
		);
		const prevBookingsCount = prevMonthBookings.length;

		const revenueGrowth =
			prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
			: totalRevenue > 0 ? 100
			: 0;

		const bookingsGrowth =
			prevBookingsCount > 0 ?
				((totalBookings - prevBookingsCount) / prevBookingsCount) * 100
			: totalBookings > 0 ? 100
			: 0;

		return {
			totalRevenue,
			totalBookings,
			occupancyRate,
			uniquePlayers: uniquePlayers.size,
			revenueByDay,
			confirmedBookings,
			prevRevenue,
			prevBookingsCount,
			revenueGrowth,
			bookingsGrowth,
			paidRevenue,
			pendingRevenue,
			paidBookings,
			pendingBookings,
		};
	}, [bookings, timeSlots, selectedMonth]);

	// Get last 12 months for selector (current month + 11 previous months)
	const monthOptions = useMemo(() => {
		const options = [];
		const today = new Date();
		for (let i = 0; i < 12; i++) {
			// Subtrair i meses do mês atual
			const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
			options.push({
				value: format(targetDate, "yyyy-MM"),
				label: format(targetDate, "MMMM 'de' yyyy", { locale: ptBR }),
			});
		}
		// Ordem: mês atual primeiro, depois os anteriores
		return options;
	}, []);

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(value);
	};

	const renderGrowthIndicator = (growth: number) => {
		if (growth > 0) {
			return (
				<div className="flex items-center gap-1 text-primary text-xs font-bold drop-shadow-[0_0_5px_hsl(var(--primary)/0.4)]">
					<TrendingUp className="h-3 w-3" />+{growth.toFixed(1)}%
				</div>
			);
		} else if (growth < 0) {
			return (
				<div className="flex items-center gap-1 text-destructive text-xs font-medium">
					<TrendingDown className="h-3 w-3" />
					{growth.toFixed(1)}%
				</div>
			);
		}
		return (
			<div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
				<Minus className="h-3 w-3" />
				0%
			</div>
		);
	};

	const handleExport = () => {
		const csvContent = [
			["Data", "Horário", "Jogador", "Valor"],
			...metrics.confirmedBookings.map((booking) => [
				format(new Date(booking.date), "dd/MM/yyyy"),
				booking.time,
				booking.bookedBy || "N/A",
				(booking.totalPrice ?? 0).toFixed(2),
			]),
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `faturamento_${selectedMonth}.csv`;
		link.click();
	};

	return (
		<div className="space-y-6 md:space-y-8">
			{/* Header estilo Fintech - Hero compacto */}
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-2 via-surface-1 to-surface-2 border border-white/5 p-6 md:p-8">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
				<div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

				<div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
								<DollarSign className="w-4 h-4 text-white" />
							</div>
							<h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
								Cockpit Financeiro
							</h1>
						</div>
						<p className="text-sm text-gray-300 mt-1">
							Visão completa do faturamento • Atualizado em tempo real
						</p>
					</div>
					<div className="flex gap-2 md:gap-3 w-full md:w-auto">
						<Select value={selectedMonth} onValueChange={setSelectedMonth}>
							<SelectTrigger className="flex-1 md:w-[200px] h-11 rounded-xl border-white/10 bg-white/5 backdrop-blur-sm focus:ring-2 focus:ring-emerald-500/30 hover:bg-white/10 transition-colors">
								<Calendar className="w-4 h-4 mr-2 text-gray-300" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{monthOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							className="gap-2 h-11 px-4 rounded-xl border-white/10 bg-white/5 backdrop-blur-sm text-gray-300 hover:bg-white/10 hover:text-white hover:border-emerald-500/30 transition-all duration-200 active:scale-[0.98]"
							onClick={handleExport}>
							<Download className="h-4 w-4" />
							<span className="hidden sm:inline">Exportar</span>
						</Button>
					</div>
				</div>

				{/* Quick Stats Bar - apenas info única (jogadores) */}
				<div className="relative mt-6 pt-5 border-t border-white/5 flex flex-wrap gap-6">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
						<span className="text-xs text-gray-300">
							<span className="font-medium text-white">
								{metrics.uniquePlayers}
							</span>{" "}
							jogadores únicos neste mês
						</span>
					</div>
					<div className="flex items-center gap-2">
						<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
						<span className="text-xs text-gray-300">
							<span className="font-medium text-emerald-400">
								{metrics.revenueGrowth > 0 ? "+" : ""}
								{metrics.revenueGrowth.toFixed(0)}%
							</span>{" "}
							vs mês anterior
						</span>
					</div>
				</div>
			</div>

			{/* KPI Cards — Estilo Stripe/Fintech com Progress Bars */}
			<div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				{loading ?
					<>
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
					</>
				:	<>
						{/* Receita Total - Card Principal */}
						<div className="relative col-span-1 sm:col-span-2 flex flex-col p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-surface-2 to-surface-2 border border-emerald-500/20 shadow-xl shadow-emerald-500/5 backdrop-blur-md group overflow-hidden">
							<div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
							<div className="relative flex justify-between items-start mb-3">
								<div>
									<span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">
										Receita do Mês
									</span>
									<div className="flex items-baseline gap-2 mt-1">
										<span className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums">
											{formatCurrency(metrics.totalRevenue)}
										</span>
									</div>
								</div>
								<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
									<DollarSign className="w-6 h-6 text-white" />
								</div>
							</div>
							<div className="relative flex items-center gap-3 mt-auto">
								{renderGrowthIndicator(metrics.revenueGrowth)}
								<span className="text-xs text-gray-300">vs mês anterior</span>
							</div>
							{/* Mini Progress - Meta visual */}
							<div className="relative mt-4">
								<div className="flex justify-between text-[10px] mb-1">
									<span className="text-gray-300">Progresso do mês</span>
									<span className="text-emerald-400 font-medium">
										{Math.min(
											100,
											Math.round((new Date().getDate() / 30) * 100),
										)}
										%
									</span>
								</div>
								<div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
										style={{
											width: `${Math.min(100, Math.round((new Date().getDate() / 30) * 100))}%`,
										}}
									/>
								</div>
							</div>
						</div>

						{/* Reservas */}
						<div className="relative flex flex-col p-5 rounded-2xl bg-surface-2/80 border border-white/5 hover:border-white/10 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 backdrop-blur-md group">
							<div className="flex justify-between items-start mb-2">
								<span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
									Reservas
								</span>
								<span className="rounded-xl bg-blue-500/10 p-2 ring-1 ring-blue-500/20">
									<Calendar className="w-4 h-4 text-blue-400" />
								</span>
							</div>
							<span className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">
								{metrics.totalBookings}
							</span>
							<div className="flex items-center gap-2 mt-2">
								{renderGrowthIndicator(metrics.bookingsGrowth)}
								<span className="text-[10px] text-gray-300">
									vs mês anterior
								</span>
							</div>
							{/* Breakdown mini */}
							<div className="mt-3 pt-3 border-t border-white/5 flex gap-3 text-[10px]">
								<span className="text-gray-300">
									<span className="text-emerald-400 font-semibold">
										{metrics.paidBookings.length}
									</span>{" "}
									pagas
								</span>
								<span className="text-gray-300">
									<span className="text-amber-400 font-semibold">
										{metrics.pendingBookings.length}
									</span>{" "}
									pendentes
								</span>
							</div>
						</div>

						{/* Ocupação */}
						<div className="relative flex flex-col p-5 rounded-2xl bg-surface-2/80 border border-white/5 hover:border-white/10 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 backdrop-blur-md group">
							<div className="flex justify-between items-start mb-2">
								<span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
									Taxa de Ocupação
								</span>
								<span className="rounded-xl bg-purple-500/10 p-2 ring-1 ring-purple-500/20">
									<BarChart3 className="w-4 h-4 text-purple-400" />
								</span>
							</div>
							<span className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">
								{metrics.occupancyRate.toFixed(0)}%
							</span>
							<p className="text-[10px] text-gray-300 mt-1">
								dos slots disponíveis
							</p>
							{/* Visual gauge */}
							<div className="mt-3 relative">
								<div className="h-2 bg-white/5 rounded-full overflow-hidden">
									<div
										className={`h-full rounded-full transition-all duration-1000 ${
											metrics.occupancyRate >= 70 ?
												"bg-gradient-to-r from-emerald-500 to-emerald-400"
											: metrics.occupancyRate >= 40 ?
												"bg-gradient-to-r from-amber-500 to-amber-400"
											:	"bg-gradient-to-r from-red-500 to-red-400"
										}`}
										style={{ width: `${metrics.occupancyRate}%` }}
									/>
								</div>
							</div>
						</div>
					</>
				}
			</div>

			{/* Dinheiro na Mesa - Card de Alerta */}
			{!loading && metrics.pendingRevenue > 0 && (
				<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 p-5">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
					<div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex items-start gap-4">
							<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
								<AlertCircle className="w-6 h-6 text-white" />
							</div>
							<div>
								<h3 className="font-semibold text-white flex items-center gap-2">
									Dinheiro na Mesa
									<Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">
										{metrics.pendingBookings.length} pendentes
									</Badge>
								</h3>
								<p className="text-sm text-gray-300 mt-0.5">
									Você tem{" "}
									<span className="font-bold text-amber-400">
										{formatCurrency(metrics.pendingRevenue)}
									</span>{" "}
									em reservas aguardando confirmação
								</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/50 rounded-xl gap-2 whitespace-nowrap">
							Ver pendências
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			)}

			{/* Revenue Chart - Estilo Area Chart Visual */}
			<Card className="bg-surface-2/80 border border-white/5 rounded-2xl backdrop-blur-md relative overflow-hidden hover:border-white/10 transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
				<div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-3 text-white">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 flex items-center justify-center ring-1 ring-emerald-500/20">
								<TrendingUp className="h-5 w-5 text-emerald-400" />
							</div>
							<div>
								<span className="text-base font-semibold">
									Fluxo de Receita
								</span>
								<p className="text-xs text-gray-300 font-normal mt-0.5">
									Receita diária no período
								</p>
							</div>
						</CardTitle>
						{Object.keys(metrics.revenueByDay).length > 0 && (
							<div className="text-right">
								<p className="text-2xl font-bold text-white tabular-nums">
									{formatCurrency(metrics.totalRevenue)}
								</p>
								<p className="text-[10px] text-gray-300">total do período</p>
							</div>
						)}
					</div>
				</CardHeader>
				<CardContent className="pt-4">
					{loading ?
						<div className="space-y-4">
							<Skeleton className="h-8 w-full bg-gray-800" />
							<Skeleton className="h-8 w-full bg-gray-800" />
							<Skeleton className="h-8 w-full bg-gray-800" />
						</div>
					: Object.keys(metrics.revenueByDay).length === 0 ?
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="relative mb-6">
								<div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex items-center justify-center ring-1 ring-emerald-500/10">
									<Sparkles className="h-10 w-10 text-emerald-500/40" />
								</div>
								<div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center">
									<Zap className="w-3 h-3 text-emerald-400" />
								</div>
							</div>
							<h3 className="text-sm font-medium text-white mb-1">
								O motor está pronto!
							</h3>
							<p className="text-xs text-gray-300 max-w-[200px] mb-4">
								Assim que as primeiras reservas chegarem, seus gráficos ganham
								vida
							</p>
							{onNavigateToAgenda && (
								<Button
									variant="outline"
									size="sm"
									onClick={onNavigateToAgenda}
									className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 rounded-xl gap-2">
									<Calendar className="w-4 h-4" />
									Criar reserva
								</Button>
							)}
						</div>
					:	<div className="space-y-3">
							{/* Visual Area Chart Representation */}
							<div className="relative h-32 flex items-end gap-1 px-2">
								{Object.entries(metrics.revenueByDay)
									.sort(([a], [b]) => a.localeCompare(b))
									.map(([date, revenue], index, arr) => {
										const maxRevenue = Math.max(
											...Object.values(metrics.revenueByDay),
										);
										const percentage = (revenue / maxRevenue) * 100;
										const isLast = index === arr.length - 1;

										return (
											<div
												key={date}
												className="flex-1 flex flex-col items-center group cursor-pointer"
												title={`${format(new Date(date), "dd/MM", { locale: ptBR })}: ${formatCurrency(revenue)}`}>
												<div className="relative w-full flex justify-center">
													{/* Tooltip on hover */}
													<div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-1 border border-white/10 rounded-lg px-2 py-1 text-[10px] whitespace-nowrap z-10 pointer-events-none">
														<span className="text-white font-medium">
															{formatCurrency(revenue)}
														</span>
													</div>
													{/* Bar */}
													<div
														className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ${
															isLast ?
																"bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20"
															:	"bg-gradient-to-t from-emerald-600/60 to-emerald-500/40 group-hover:from-emerald-600 group-hover:to-emerald-400"
														}`}
														style={{ height: `${Math.max(percentage, 8)}%` }}
													/>
												</div>
												<span className="text-[9px] text-gray-400 mt-1.5 group-hover:text-gray-300 transition-colors">
													{format(new Date(date), "dd", { locale: ptBR })}
												</span>
											</div>
										);
									})}
							</div>

							{/* Summary row */}
							<div className="flex items-center justify-between pt-4 border-t border-white/5">
								<div className="flex items-center gap-4 text-xs">
									<div className="flex items-center gap-1.5">
										<div className="w-2 h-2 rounded-full bg-emerald-400" />
										<span className="text-gray-300">Maior dia:</span>
										<span className="text-white font-medium">
											{formatCurrency(
												Math.max(...Object.values(metrics.revenueByDay)),
											)}
										</span>
									</div>
									<div className="flex items-center gap-1.5">
										<div className="w-2 h-2 rounded-full bg-gray-600" />
										<span className="text-gray-300">Média:</span>
										<span className="text-white font-medium">
											{formatCurrency(
												metrics.totalRevenue /
													Object.keys(metrics.revenueByDay).length,
											)}
										</span>
									</div>
								</div>
								<span className="text-[10px] text-gray-400">
									{Object.keys(metrics.revenueByDay).length} dias com receita
								</span>
							</div>
						</div>
					}
				</CardContent>
			</Card>

			{/* Recent Bookings Table - Estilo Extrato Bancário */}
			<Card className="bg-surface-2/80 border border-white/5 rounded-2xl backdrop-blur-md hover:border-white/10 transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/5 overflow-hidden">
				<CardHeader className="border-b border-white/5 pb-4">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-3 text-white">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-600/20 flex items-center justify-center ring-1 ring-blue-500/20">
								<Clock className="h-5 w-5 text-blue-400" />
							</div>
							<div>
								<span className="text-base font-semibold">Movimentações</span>
								<p className="text-xs text-gray-300 font-normal mt-0.5">
									Histórico de transações
								</p>
							</div>
						</CardTitle>
						{metrics.confirmedBookings.length > 0 && (
							<Badge className="bg-white/5 text-gray-300 border-0">
								{metrics.confirmedBookings.length} transações
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{loading ?
						<div className="p-4 space-y-3">
							<Skeleton className="h-16 w-full bg-gray-800" />
							<Skeleton className="h-16 w-full bg-gray-800" />
							<Skeleton className="h-16 w-full bg-gray-800" />
						</div>
					: metrics.confirmedBookings.length === 0 ?
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="relative mb-6">
								<div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 flex items-center justify-center ring-1 ring-blue-500/10">
									<CreditCard className="h-10 w-10 text-blue-500/40" />
								</div>
							</div>
							<h3 className="text-sm font-medium text-white mb-1">
								Nenhuma transação ainda
							</h3>
							<p className="text-xs text-gray-300 max-w-[200px] mb-4">
								As reservas pagas aparecerão aqui como um extrato
							</p>
							{onNavigateToAgenda && (
								<Button
									variant="outline"
									size="sm"
									onClick={onNavigateToAgenda}
									className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 rounded-xl gap-2">
									<Calendar className="w-4 h-4" />
									Ver agenda
								</Button>
							)}
						</div>
					:	<div className="divide-y divide-white/5">
							{metrics.confirmedBookings
								.sort((a, b) => {
									const dateCompare = b.date.localeCompare(a.date);
									if (dateCompare !== 0) return dateCompare;
									return b.time.localeCompare(a.time);
								})
								.slice(0, 10)
								.map((booking, index) => {
									const isPaid = booking.status === "confirmed";
									return (
										<div
											key={booking.id}
											className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group">
											<div className="flex items-center gap-4">
												{/* Icon with status indicator */}
												<div className="relative">
													<div
														className={`w-10 h-10 rounded-xl flex items-center justify-center ${
															isPaid ? "bg-emerald-500/10" : "bg-amber-500/10"
														}`}>
														{isPaid ?
															<CheckCircle2 className="w-5 h-5 text-emerald-400" />
														:	<Clock className="w-5 h-5 text-amber-400" />}
													</div>
												</div>

												<div className="flex flex-col">
													<div className="flex items-center gap-2">
														<span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
															{booking.bookedBy || "Cliente"}
														</span>
														<Badge
															className={`text-[9px] border-0 ${
																isPaid ?
																	"bg-emerald-500/10 text-emerald-400"
																:	"bg-amber-500/10 text-amber-400"
															}`}>
															{isPaid ? "Pago" : "Pendente"}
														</Badge>
													</div>
													<div className="flex items-center gap-2 mt-0.5">
														<span className="text-xs text-gray-300">
															{format(new Date(booking.date), "dd MMM", {
																locale: ptBR,
															})}
														</span>
														<span className="text-gray-700">•</span>
														<span className="text-xs text-gray-300 font-mono">
															{booking.time}
														</span>
													</div>
												</div>
											</div>

											<div className="text-right flex items-center gap-3">
												{/* Payment method icon */}
												<div className="hidden sm:flex w-8 h-8 rounded-lg bg-white/5 items-center justify-center">
													<Banknote className="w-4 h-4 text-gray-300" />
												</div>
												<div>
													<div
														className={`font-bold tabular-nums text-lg ${
															isPaid ? "text-emerald-400" : "text-amber-400"
														}`}>
														+{formatCurrency(booking.totalPrice ?? 0)}
													</div>
												</div>
											</div>
										</div>
									);
								})}
							{metrics.confirmedBookings.length > 10 && (
								<div className="p-4 text-center border-t border-white/5 bg-white/[0.01]">
									<Button
										variant="ghost"
										size="sm"
										className="text-gray-300 hover:text-white gap-2">
										Ver todas as {metrics.confirmedBookings.length} transações
										<ChevronRight className="w-4 h-4" />
									</Button>
								</div>
							)}
						</div>
					}
				</CardContent>
			</Card>
		</div>
	);
}
