import { useMemo, useState } from "react";
import {
	AlertCircle,
	Banknote,
	BarChart3,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
	CreditCard,
	DollarSign,
	Download,
	Minus,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings } from "@/contexts/BookingsContext";
import {
	AdminEmptyState,
	AdminMetric,
	AdminPage,
	AdminPageHeader,
	AdminPanel,
	AdminToolbar,
} from "@/components/admin/AdminUI";

type FinanceiroViewProps = {
	onNavigateToAgenda?: () => void;
};

export default function FinanceiroView({
	onNavigateToAgenda,
}: FinanceiroViewProps) {
	const { bookings, timeSlots, loading } = useBookings();
	const [selectedMonth, setSelectedMonth] = useState(() => {
		return format(new Date(), "yyyy-MM");
	});

	const metrics = useMemo(() => {
		const monthStart = startOfMonth(new Date(`${selectedMonth}-01`));
		const monthEnd = endOfMonth(new Date(`${selectedMonth}-01`));

		const confirmedBookings = bookings.filter((booking) => {
			if (booking.status === "cancelled") return false;
			if (
				booking.status !== "confirmed" &&
				booking.status !== "pending_approval"
			) {
				return false;
			}
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

		const revenueByDay: Record<string, number> = {};
		confirmedBookings.forEach((booking) => {
			const day = booking.date;
			const revenue = booking.totalPrice ?? 0;
			revenueByDay[day] = (revenueByDay[day] || 0) + revenue;
		});

		const uniquePlayers = new Set(
			confirmedBookings.map((booking) => booking.bookedBy).filter(Boolean),
		);

		const paidBookings = confirmedBookings.filter(
			(booking) => booking.status === "confirmed",
		);
		const pendingBookings = confirmedBookings.filter(
			(booking) => booking.status === "pending_approval",
		);
		const paidRevenue = paidBookings.reduce(
			(sum, booking) => sum + (booking.totalPrice ?? 0),
			0,
		);
		const pendingRevenue = pendingBookings.reduce(
			(sum, booking) => sum + (booking.totalPrice ?? 0),
			0,
		);

		const selectedDate = new Date(`${selectedMonth}-01`);
		const prevMonthStart = startOfMonth(
			new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1),
		);
		const prevMonthEnd = endOfMonth(prevMonthStart);

		const prevMonthBookings = bookings.filter((booking) => {
			if (booking.status === "cancelled") return false;
			if (
				booking.status !== "confirmed" &&
				booking.status !== "pending_approval"
			) {
				return false;
			}
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
			bookingsGrowth,
			confirmedBookings,
			occupancyRate,
			paidBookings,
			paidRevenue,
			pendingBookings,
			pendingRevenue,
			revenueByDay,
			revenueGrowth,
			totalBookings,
			totalRevenue,
			uniquePlayers: uniquePlayers.size,
		};
	}, [bookings, selectedMonth, timeSlots]);

	const monthOptions = useMemo(() => {
		const today = new Date();
		return Array.from({ length: 12 }, (_, index) => {
			const targetDate = new Date(
				today.getFullYear(),
				today.getMonth() - index,
				1,
			);
			return {
				value: format(targetDate, "yyyy-MM"),
				label: format(targetDate, "MMMM 'de' yyyy", { locale: ptBR }),
			};
		});
	}, []);

	const selectedMonthLabel =
		monthOptions.find((option) => option.value === selectedMonth)?.label ||
		selectedMonth;

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(value);
	};

	const renderGrowthIndicator = (growth: number) => {
		if (growth > 0) {
			return (
				<span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b71ee]">
					<TrendingUp className="h-3 w-3" />+{growth.toFixed(1)}%
				</span>
			);
		}
		if (growth < 0) {
			return (
				<span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
					<TrendingDown className="h-3 w-3" />
					{growth.toFixed(1)}%
				</span>
			);
		}
		return (
			<span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
				<Minus className="h-3 w-3" />
				0%
			</span>
		);
	};

	const handleExport = () => {
		const csvContent = [
			["Data", "Horario", "Jogador", "Valor"],
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

	const revenueEntries = Object.entries(metrics.revenueByDay).sort(([a], [b]) =>
		a.localeCompare(b),
	);
	const maxRevenue = Math.max(0, ...Object.values(metrics.revenueByDay));

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="Financeiro"
				title="Caixa"
				description={
					<span>
						{selectedMonthLabel}. Receita, pendências e movimentações em uma
						leitura direta.
					</span>
				}
				actions={
					<Button
						variant="outline"
						className="h-10 gap-2 rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
						onClick={handleExport}>
						<Download className="h-4 w-4" />
						<span>Exportar</span>
					</Button>
				}
			/>

			<AdminToolbar>
				<div className="flex min-w-0 flex-col gap-1 px-1">
					<span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
						Período
					</span>
					<span className="text-sm font-semibold capitalize text-slate-950">
						{selectedMonthLabel}
					</span>
				</div>
				<Select value={selectedMonth} onValueChange={setSelectedMonth}>
					<SelectTrigger className="h-10 w-full rounded-md border-slate-200 bg-white text-slate-700 shadow-none sm:w-[220px]">
						<Calendar className="mr-2 h-4 w-4 text-slate-400" />
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
			</AdminToolbar>

			{loading ?
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<Skeleton className="h-[138px] rounded-lg bg-slate-200 sm:col-span-2" />
					<Skeleton className="h-[138px] rounded-lg bg-slate-200" />
					<Skeleton className="h-[138px] rounded-lg bg-slate-200" />
				</div>
			:	<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<AdminPanel className="p-5 sm:col-span-2">
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0">
								<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
									Receita do mês
								</p>
								<p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
									{formatCurrency(metrics.totalRevenue)}
								</p>
								<div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
									{renderGrowthIndicator(metrics.revenueGrowth)}
									<span>vs mês anterior</span>
								</div>
							</div>
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#0b71ee] ring-1 ring-blue-100">
								<DollarSign className="h-5 w-5" />
							</div>
						</div>
						<div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-sm">
							<div>
								<p className="text-xs text-slate-500">Recebido</p>
								<p className="mt-1 font-semibold text-[#0b71ee]">
									{formatCurrency(metrics.paidRevenue)}
								</p>
							</div>
							<div>
								<p className="text-xs text-slate-500">A receber</p>
								<p className="mt-1 font-semibold text-amber-600">
									{formatCurrency(metrics.pendingRevenue)}
								</p>
							</div>
						</div>
					</AdminPanel>
					<AdminMetric
						label="Reservas"
						value={metrics.totalBookings}
						tone="blue"
						icon={<Calendar className="h-4 w-4" />}
					/>
					<AdminMetric
						label="Ocupação"
						value={`${metrics.occupancyRate.toFixed(0)}%`}
						tone="slate"
						icon={<BarChart3 className="h-4 w-4" />}
					/>
					<AdminMetric
						label="Jogadores únicos"
						value={metrics.uniquePlayers}
						tone="slate"
						icon={<Users className="h-4 w-4" />}
						className="xl:col-start-3"
					/>
					<AdminMetric
						label="Reservas pendentes"
						value={metrics.pendingBookings.length}
						tone="amber"
						icon={<Clock className="h-4 w-4" />}
					/>
				</div>
			}

			{!loading && metrics.pendingRevenue > 0 && (
				<AdminPanel className="border-amber-200 bg-amber-50 p-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-start gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
								<AlertCircle className="h-5 w-5" />
							</div>
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="font-semibold text-amber-950">
										Pendências de pagamento
									</h3>
									<Badge className="border-0 bg-amber-100 text-amber-700">
										{metrics.pendingBookings.length} reserva(s)
									</Badge>
								</div>
								<p className="mt-1 text-sm text-amber-900/75">
									{formatCurrency(metrics.pendingRevenue)} aguardando
									confirmação no período.
								</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={onNavigateToAgenda}
							className="h-9 gap-2 rounded-md border-amber-300 bg-white/60 text-amber-800 hover:bg-amber-100"
							disabled={!onNavigateToAgenda}>
							Ver na agenda
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</AdminPanel>
			)}

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
				<AdminPanel>
					<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-[#0b71ee] ring-1 ring-blue-100">
								<TrendingUp className="h-4 w-4" />
							</div>
							<div>
								<h2 className="text-sm font-semibold text-slate-950">
									Receita diária
								</h2>
								<p className="text-xs text-slate-500">
									Dias com movimentação no período
								</p>
							</div>
						</div>
						{revenueEntries.length > 0 && (
							<p className="hidden text-right text-sm font-semibold text-slate-950 sm:block">
								{formatCurrency(metrics.totalRevenue)}
							</p>
						)}
					</div>
					<div className="p-4">
						{loading ?
							<div className="space-y-3">
								<Skeleton className="h-8 w-full bg-slate-200" />
								<Skeleton className="h-8 w-10/12 bg-slate-200" />
								<Skeleton className="h-8 w-8/12 bg-slate-200" />
							</div>
						: revenueEntries.length === 0 ?
							<AdminEmptyState
								icon={<BarChart3 className="h-6 w-6" />}
								title="Sem receita no período"
								description="As reservas confirmadas alimentarão esse gráfico automaticamente."
								action={
									onNavigateToAgenda ? (
										<Button
											variant="outline"
											size="sm"
											onClick={onNavigateToAgenda}
											className="gap-2 rounded-md border-blue-200 text-[#0b71ee] hover:bg-blue-50">
											<Calendar className="h-4 w-4" />
											Criar reserva
										</Button>
									) : null
								}
							/>
						:	<div className="space-y-4">
								<div className="flex h-44 items-end gap-1.5 border-b border-slate-200 px-1">
									{revenueEntries.map(([date, revenue], index) => {
										const height =
											maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
										const isLast = index === revenueEntries.length - 1;

										return (
											<div
												key={date}
												className="group flex min-w-[22px] flex-1 flex-col items-center justify-end"
												title={`${format(new Date(date), "dd/MM", { locale: ptBR })}: ${formatCurrency(revenue)}`}>
												<div className="relative flex w-full justify-center">
													<div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-900 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
														{formatCurrency(revenue)}
													</div>
													<div
														className={
															isLast ?
																"w-full max-w-9 rounded-t-md bg-[#0b71ee]"
															:	"w-full max-w-9 rounded-t-md bg-blue-200 transition-colors group-hover:bg-[#0b71ee]"
														}
														style={{ height: `${Math.max(height, 8)}%` }}
													/>
												</div>
												<span className="mt-2 text-[10px] text-slate-500">
													{format(new Date(date), "dd", { locale: ptBR })}
												</span>
											</div>
										);
									})}
								</div>
								<div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
									<span>
										<strong className="font-semibold text-slate-950">
											{revenueEntries.length}
										</strong>{" "}
										dia(s) com receita
									</span>
									<span>
										<strong className="font-semibold text-slate-950">
											{formatCurrency(
												metrics.totalRevenue / revenueEntries.length,
											)}
										</strong>{" "}
										de média
									</span>
								</div>
							</div>
						}
					</div>
				</AdminPanel>

				<AdminPanel>
					<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-[#0b71ee] ring-1 ring-blue-100">
								<CreditCard className="h-4 w-4" />
							</div>
							<div>
								<h2 className="text-sm font-semibold text-slate-950">
									Movimentações
								</h2>
								<p className="text-xs text-slate-500">Últimas reservas</p>
							</div>
						</div>
						{metrics.confirmedBookings.length > 0 && (
							<Badge className="border-0 bg-slate-100 text-slate-600">
								{metrics.confirmedBookings.length}
							</Badge>
						)}
					</div>
					<div>
						{loading ?
							<div className="space-y-3 p-4">
								<Skeleton className="h-14 w-full bg-slate-200" />
								<Skeleton className="h-14 w-full bg-slate-200" />
								<Skeleton className="h-14 w-full bg-slate-200" />
							</div>
						: metrics.confirmedBookings.length === 0 ?
							<AdminEmptyState
								icon={<CreditCard className="h-6 w-6" />}
								title="Nenhuma movimentação"
								description="Reservas pagas e pendentes aparecerão aqui como extrato."
							/>
						:	<div className="divide-y divide-slate-200">
								{metrics.confirmedBookings
									.sort((a, b) => {
										const dateCompare = b.date.localeCompare(a.date);
										if (dateCompare !== 0) return dateCompare;
										return b.time.localeCompare(a.time);
									})
									.slice(0, 10)
									.map((booking) => {
										const isPaid = booking.status === "confirmed";
										return (
											<div
												key={booking.id}
												className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50">
												<div className="flex min-w-0 items-center gap-3">
													<div
														className={
															isPaid ?
																"flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#0b71ee]"
															:	"flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600"
														}>
														{isPaid ?
															<CheckCircle2 className="h-5 w-5" />
														:	<Clock className="h-5 w-5" />
														}
													</div>
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<p className="truncate text-sm font-semibold text-slate-950">
																{booking.bookedBy || "Cliente"}
															</p>
															<Badge
																className={
																	isPaid ?
																		"border-0 bg-blue-50 text-[#0b71ee]"
																	:	"border-0 bg-amber-50 text-amber-600"
																}>
																{isPaid ? "Pago" : "Pendente"}
															</Badge>
														</div>
														<p className="mt-0.5 text-xs text-slate-500">
															{format(new Date(booking.date), "dd MMM", {
																locale: ptBR,
															})}{" "}
															- {booking.time}
														</p>
													</div>
												</div>
												<div className="flex shrink-0 items-center gap-2 text-right">
													<div className="hidden h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500 sm:flex">
														<Banknote className="h-4 w-4" />
													</div>
													<p
														className={
															isPaid ?
																"text-sm font-semibold text-[#0b71ee]"
															:	"text-sm font-semibold text-amber-600"
														}>
														{formatCurrency(booking.totalPrice ?? 0)}
													</p>
												</div>
											</div>
										);
									})}
							</div>
						}
					</div>
				</AdminPanel>
			</div>
		</AdminPage>
	);
}
