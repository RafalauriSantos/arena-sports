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

export default function FinanceiroView({ onNavigateToAgenda }: FinanceiroViewProps) {
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
			if (booking.status !== "confirmed" && booking.status !== "pending_approval")
				return false;
			const bookingDate = new Date(booking.date);
			return isWithinInterval(bookingDate, {
				start: monthStart,
				end: monthEnd,
			});
		});

		const totalRevenue = confirmedBookings.reduce(
			(sum, booking) => sum + (booking.totalPrice ?? 0),
			0
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
			confirmedBookings.map((booking) => booking.bookedBy).filter(Boolean)
		);

		// Calculate previous month metrics for comparison
		const prevMonthStart = startOfMonth(
			new Date(
				new Date(selectedMonth + "-01").setMonth(
					new Date(selectedMonth + "-01").getMonth() - 1
				)
			)
		);
		const prevMonthEnd = endOfMonth(
			new Date(
				new Date(selectedMonth + "-01").setMonth(
					new Date(selectedMonth + "-01").getMonth() - 1
				)
			)
		);

		const prevMonthBookings = bookings.filter((booking) => {
			if (booking.status === "cancelled") return false;
			if (booking.status !== "confirmed" && booking.status !== "pending_approval")
				return false;
			const bookingDate = new Date(booking.date);
			return isWithinInterval(bookingDate, {
				start: prevMonthStart,
				end: prevMonthEnd,
			});
		});

		const prevRevenue = prevMonthBookings.reduce(
			(sum, booking) => sum + (booking.totalPrice ?? 0),
			0
		);
		const prevBookingsCount = prevMonthBookings.length;

		const revenueGrowth =
			prevRevenue > 0
				? ((totalRevenue - prevRevenue) / prevRevenue) * 100
				: totalRevenue > 0
				? 100
				: 0;

		const bookingsGrowth =
			prevBookingsCount > 0
				? ((totalBookings - prevBookingsCount) / prevBookingsCount) * 100
				: totalBookings > 0
				? 100
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
		};
	}, [bookings, timeSlots, selectedMonth]);

	// Get last 6 months for selector
	const monthOptions = useMemo(() => {
		const options = [];
		const today = new Date();
		for (let i = 0; i < 6; i++) {
			const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
			options.push({
				value: format(date, "yyyy-MM"),
				label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
			});
		}
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
			{/* Header padronizado: título + subtítulo */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
						Financeiro
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Acompanhe faturamento e receitas
					</p>
				</div>
				<div className="flex gap-2 md:gap-3 w-full md:w-auto">
					<Select value={selectedMonth} onValueChange={setSelectedMonth}>
						<SelectTrigger className="flex-1 md:w-[200px] h-11 rounded-xl border-white/10 bg-surface-2/60 focus:ring-2 focus:ring-emerald-500/30">
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
						className="gap-2 h-11 rounded-xl border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1115]"
						onClick={handleExport}>
						<Download className="h-4 w-4" />
						Exportar
					</Button>
				</div>
			</div>

			{/* KPI Cards — estilo MetricPill (bg, borda, ícone em pill, trend) */}
			<div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
				{loading ? (
					<>
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
					</>
				) : (
					<>
						<div className="flex flex-col p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-2/80 border border-white/5 hover:border-white/10 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 backdrop-blur-md group">
							<div className="flex justify-between items-start mb-1 sm:mb-2">
								<span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Receita do mês</span>
								<span className="rounded-lg bg-emerald-500/10 p-1.5 ring-1 ring-white/5">
									<DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
								</span>
							</div>
							<span className="text-lg sm:text-xl font-bold text-white tracking-tight tabular-nums">
								{formatCurrency(metrics.totalRevenue)}
							</span>
							<div className="mt-1">{renderGrowthIndicator(metrics.revenueGrowth)}</div>
							<p className="text-[10px] font-medium mt-0.5 text-gray-500">vs mês anterior</p>
						</div>
						<div className="flex flex-col p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-2/80 border border-white/5 hover:border-white/10 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 backdrop-blur-md group">
							<div className="flex justify-between items-start mb-1 sm:mb-2">
								<span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Reservas</span>
								<span className="rounded-lg bg-emerald-500/10 p-1.5 ring-1 ring-white/5">
									<Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
								</span>
							</div>
							<span className="text-lg sm:text-xl font-bold text-white tracking-tight tabular-nums">
								{metrics.totalBookings}
							</span>
							<div className="mt-1">{renderGrowthIndicator(metrics.bookingsGrowth)}</div>
							<p className="text-[10px] font-medium mt-0.5 text-gray-500">vs mês anterior</p>
						</div>
						<div className="flex flex-col p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-2/80 border border-white/5 hover:border-white/10 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 backdrop-blur-md group">
							<div className="flex justify-between items-start mb-1 sm:mb-2">
								<span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Crescimento receita</span>
								<span className="rounded-lg bg-emerald-500/10 p-1.5 ring-1 ring-white/5">
									<TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
								</span>
							</div>
							<span className="text-lg sm:text-xl font-bold text-white tracking-tight tabular-nums">
								{metrics.revenueGrowth > 0 ? "+" : ""}{metrics.revenueGrowth.toFixed(1)}%
							</span>
							<p className="text-[10px] font-medium mt-1 text-gray-500">vs mês anterior</p>
						</div>
						<div className="flex flex-col p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-2/80 border border-white/5 hover:border-white/10 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 backdrop-blur-md group">
							<div className="flex justify-between items-start mb-1 sm:mb-2">
								<span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Ocupação</span>
								<span className="rounded-lg bg-emerald-500/10 p-1.5 ring-1 ring-white/5">
									<Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
								</span>
							</div>
							<span className="text-lg sm:text-xl font-bold text-white tracking-tight tabular-nums">
								{metrics.occupancyRate.toFixed(0)}%
							</span>
							<p className="text-[10px] font-medium mt-1 text-gray-500">slots do mês</p>
						</div>
					</>
				)}
			</div>

			{/* Revenue Chart */}
			<Card className="bg-surface-2/80 border border-white/5 rounded-2xl backdrop-blur-md relative overflow-hidden hover:border-white/10 transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
				<div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-white">
						<TrendingUp className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
						Receita por Dia
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-4">
							<Skeleton className="h-8 w-full bg-gray-800" />
							<Skeleton className="h-8 w-full bg-gray-800" />
							<Skeleton className="h-8 w-full bg-gray-800" />
						</div>
					) : Object.keys(metrics.revenueByDay).length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
								<BarChart3 className="h-7 w-7 text-gray-500" />
							</div>
							<p className="text-sm text-gray-400 mb-1">Nenhuma receita neste período</p>
							<p className="text-xs text-gray-500 mb-4">As reservas confirmadas aparecem aqui.</p>
							{onNavigateToAgenda && (
								<Button
									variant="outline"
									size="sm"
									onClick={onNavigateToAgenda}
									className="border-white/10 text-gray-300 hover:bg-white/5">
									Ver reservas
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-2">
							{Object.entries(metrics.revenueByDay)
								.sort(([a], [b]) => a.localeCompare(b))
								.map(([date, revenue]) => {
									const maxRevenue = Math.max(
										...Object.values(metrics.revenueByDay)
									);
									const percentage = (revenue / maxRevenue) * 100;

									return (
										<div key={date} className="space-y-1">
											<div className="flex items-center justify-between text-sm text-gray-300">
												<span className="font-medium text-gray-400">
													{format(new Date(date), "dd/MM - EEEE", {
														locale: ptBR,
													})}
												</span>
												<span className="font-bold text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.4)]">
													{formatCurrency(revenue)}
												</span>
											</div>
											<div
												className="w-full bg-gray-800 rounded-full h-2 overflow-hidden"
												title={`${format(new Date(date), "dd/MM - EEEE", { locale: ptBR })}: ${formatCurrency(revenue)}`}>
												<div
													className="h-full min-h-[8px] bg-gradient-to-r from-emerald-500 to-emerald-500/90 transition-all duration-500 rounded-full"
													style={{ width: `${Math.max(percentage, 4)}%` }}
												/>
											</div>
										</div>
									);
								})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Recent Bookings Table */}
			<Card className="bg-surface-2/80 border border-white/5 rounded-2xl backdrop-blur-md hover:border-white/10 transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
				<CardHeader>
					<CardTitle className="text-white">Reservas Recentes</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-3">
							<Skeleton className="h-16 w-full bg-gray-800" />
							<Skeleton className="h-16 w-full bg-gray-800" />
							<Skeleton className="h-16 w-full bg-gray-800" />
						</div>
					) : metrics.confirmedBookings.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
								<Calendar className="h-7 w-7 text-gray-500" />
							</div>
							<p className="text-sm text-gray-400 mb-1">Nenhuma reserva neste período</p>
							<p className="text-xs text-gray-500 mb-4">As reservas confirmadas aparecem aqui.</p>
							{onNavigateToAgenda && (
								<Button
									variant="outline"
									size="sm"
									onClick={onNavigateToAgenda}
									className="border-white/10 text-gray-300 hover:bg-white/5">
									Ver reservas
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-3">
							{metrics.confirmedBookings
								.sort((a, b) => {
									const dateCompare = b.date.localeCompare(a.date);
									if (dateCompare !== 0) return dateCompare;
									return b.time.localeCompare(a.time);
								})
								.slice(0, 10)
								.map((booking) => (
									<div
										key={booking.id}
										className="flex items-center justify-between p-4 border border-white/5 rounded-lg bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
										<div className="flex items-center gap-4">
											<div className="flex flex-col">
												<span className="font-medium text-white">
													{booking.bookedBy}
												</span>
												<span className="text-sm text-gray-400">
													{format(new Date(booking.date), "dd/MM/yyyy - EEEE", {
														locale: ptBR,
													})}
												</span>
											</div>
											<Badge
												variant="outline"
												className="border-white/10 text-gray-300">
												{booking.time}
											</Badge>
										</div>
										<div className="text-right">
											<div className="font-bold text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.4)] tabular-nums">
												{formatCurrency(booking.totalPrice ?? 0)}
											</div>
										</div>
									</div>
								))}
							{metrics.confirmedBookings.length > 10 && (
								<p className="text-sm text-center text-gray-500 pt-2">
									Mostrando 10 de {metrics.confirmedBookings.length} reservas
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
