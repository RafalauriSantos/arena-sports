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

export default function FinanceiroView() {
	const { bookings, timeSlots, loading } = useBookings(); // Assumindo que 'loading' existe
	const [selectedMonth, setSelectedMonth] = useState(() => {
		return format(new Date(), "yyyy-MM");
	});

	// Calculate financial metrics
	const metrics = useMemo(() => {
		const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
		const monthEnd = endOfMonth(new Date(selectedMonth + "-01"));

		const confirmedBookings = bookings.filter((booking) => {
			if (booking.status !== "confirmed" && booking.status !== "approved")
				return false;
			const bookingDate = new Date(booking.date);
			return isWithinInterval(bookingDate, {
				start: monthStart,
				end: monthEnd,
			});
		});

		const totalRevenue = confirmedBookings.reduce(
			(sum, booking) => sum + booking.pricePerPlayer * booking.totalPlayers,
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
			const revenue = booking.pricePerPlayer * booking.totalPlayers;
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
			if (booking.status !== "confirmed" && booking.status !== "approved")
				return false;
			const bookingDate = new Date(booking.date);
			return isWithinInterval(bookingDate, {
				start: prevMonthStart,
				end: prevMonthEnd,
			});
		});

		const prevRevenue = prevMonthBookings.reduce(
			(sum, booking) => sum + booking.pricePerPlayer * booking.totalPlayers,
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
				(booking.pricePerPlayer * booking.totalPlayers).toFixed(2),
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
		<div className="space-y-4 md:space-y-6">
			{/* Header - Mobile responsive */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-xl md:text-3xl font-black">Financeiro</h1>
					<p className="text-xs md:text-sm text-muted-foreground">
						Acompanhe faturamento e receitas
					</p>
				</div>
				<div className="flex gap-2 md:gap-3 w-full md:w-auto">
					<Select value={selectedMonth} onValueChange={setSelectedMonth}>
						<SelectTrigger className="flex-1 md:w-[200px]">
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
						className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary-foreground hover:border-primary/50 transition-all"
						onClick={handleExport}>
						<Download className="h-4 w-4" />
						Exportar
					</Button>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{loading ? (
					<>
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
					</>
				) : (
					<>{/* Cards de KPI Reais aqui... */}</>
				)}
			</div>

			{/* Revenue Chart */}
			<Card className="bg-gray-900/40 border-white/5 backdrop-blur-md relative overflow-hidden">
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
						<div className="text-center py-12 text-gray-500">
							<BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>Nenhuma receita registrada neste período</p>
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
											<div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
												<div
													className="h-full bg-gradient-to-r from-primary to-primary/90 transition-all duration-500"
													style={{ width: `${percentage}%` }}
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
			<Card className="bg-gray-900/40 border-white/5 backdrop-blur-md">
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
						<div className="text-center py-12 text-gray-500">
							<Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>Nenhuma reserva neste período</p>
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
											<div className="font-bold text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.4)]">
												{formatCurrency(
													booking.pricePerPlayer * booking.totalPlayers
												)}
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
