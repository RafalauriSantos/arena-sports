import { useMemo } from "react";
import {
	TrendingUp,
	Calendar,
	DollarSign,
	Clock,
	Activity,
	Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
} from "recharts";
import { useBookings } from "@/contexts/BookingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "@/components/admin/StatCardSkeleton";
import { OccupancyCardSkeleton } from "@/components/admin/OccupancyCardSkeleton";

const revenueData = [
	{ day: "Seg", value: 780 },
	{ day: "Ter", value: 920 },
	{ day: "Qua", value: 650 },
	{ day: "Qui", value: 1100 },
	{ day: "Sex", value: 1450 },
	{ day: "Sáb", value: 1850 },
	{ day: "Dom", value: 450 },
];

const formatCurrency = (value: number) =>
	value.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});

const isToday = (date?: Date) => {
	if (!date) return false;
	const now = new Date();
	return (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate()
	);
};

const isCurrentMonth = (date?: Date) => {
	if (!date) return false;
	const now = new Date();
	return (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth()
	);
};

const nextAvailableForField = (
	fieldId: string,
	slots: ReturnType<typeof useBookings>["timeSlots"]
) => {
	const today = new Date().toISOString().slice(0, 10);
	const avail = slots
		.filter(
			(s) =>
				s.fieldId === fieldId && s.date === today && s.status === "available"
		)
		.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
	return avail[0]?.time ?? "--";
};

export default function Dashboard() {
	const { bookings, timeSlots, loading } = useBookings(); // Assumindo que 'loading' existe

	const {
		revenueToday,
		revenueMonth,
		gamesToday,
		occupancyPrincipal,
		occupancyMedio,
		nextPrincipal,
		nextMedio,
	} = useMemo(() => {
		const todayBookings = bookings.filter((b) =>
			isToday(
				b.startTime ??
					(b.date ? new Date(`${b.date}T${b.time ?? "00:00"}`) : undefined)
			)
		);

		const monthBookings = bookings.filter((b) =>
			isCurrentMonth(
				b.startTime ??
					(b.date ? new Date(`${b.date}T${b.time ?? "00:00"}`) : undefined)
			)
		);

		const revenue = todayBookings.reduce(
			(sum, b) => sum + Number(b.totalPrice ?? 0),
			0
		);
		const revenueMonthValue = monthBookings.reduce(
			(sum, b) => sum + Number(b.totalPrice ?? 0),
			0
		);
		const games = todayBookings.length;

		const calcOcc = (fieldId: string) => {
			const slots = timeSlots.filter(
				(s) => s.fieldId === fieldId && isToday(s.startTime)
			);
			const total = slots.length;
			const available = slots.filter((s) => s.status === "available").length;
			return total > 0 ? Math.round(((total - available) / total) * 100) : 0;
		};

		return {
			revenueToday: revenue,
			revenueMonth: revenueMonthValue,
			gamesToday: games,
			occupancyPrincipal: calcOcc("principal"),
			occupancyMedio: calcOcc("medio"),
			nextPrincipal: nextAvailableForField("principal", timeSlots),
			nextMedio: nextAvailableForField("medio", timeSlots),
		};
	}, [bookings, timeSlots]);

	return (
		<div className="space-y-4 md:space-y-6">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-white">
						Visão Geral
					</h1>
					<p className="text-gray-400 mt-1">
						Acompanhe o desempenho da sua arena em tempo real.
					</p>
				</div>
			</div>

			{/* KPIs */}
			<div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-4">
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
			<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden">
				<div className="absolute top-0 right-0 p-32 bg-primary/6 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-white">
						<Activity className="h-5 w-5 text-gray-500" />
						Receita dos Últimos 7 Dias
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ResponsiveContainer width="100%" height={200} minHeight={200}>
						<BarChart data={revenueData}>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="rgba(255,255,255,0.05)"
								vertical={false}
							/>
							<XAxis
								dataKey="day"
								className="text-xs"
								stroke="#9ca3af"
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								className="text-xs"
								stroke="#9ca3af"
								tickLine={false}
								axisLine={false}
								tickFormatter={(value) => `R$${value}`}
							/>
							<Tooltip
								cursor={{ fill: "rgba(255,255,255,0.05)" }}
								contentStyle={{
									backgroundColor: "#18181b",
									borderColor: "rgba(255,255,255,0.1)",
									borderRadius: "12px",
									color: "#f3f4f6",
								}}
								itemStyle={{ color: "#fff" }}
								formatter={(value) => [
									formatCurrency(Number(value)),
									"Receita",
								]}
							/>
							<Bar
								dataKey="value"
								fill="hsl(var(--primary))"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</CardContent>
			</Card>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2">
				<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl hover:bg-black/60 transition-colors">
					<CardHeader className="pb-3">
						<div className="flex justify-between items-start">
							<CardTitle className="text-base text-white">
								Campo Principal
							</CardTitle>
							<Trophy className="h-4 w-4 text-primary" />
						</div>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm text-gray-400">
								Taxa de ocupação hoje
							</span>
							<span className="font-bold text-white">
								{occupancyPrincipal}%
							</span>
						</div>
						<div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
							<div
								className="h-full bg-primary rounded-full"
								style={{ width: `${occupancyPrincipal}%` }}
							/>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-gray-400">
								Próximo horário livre
							</span>
							<span className="font-bold text-primary">{nextPrincipal}</span>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl hover:bg-black/60 transition-colors">
					<CardHeader className="pb-3">
						<div className="flex justify-between items-start">
							<CardTitle className="text-base text-white">
								Campo Médio
							</CardTitle>
							<Trophy className="h-4 w-4 text-primary" />
						</div>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm text-gray-400">
								Taxa de ocupação hoje
							</span>
							<span className="font-bold text-white">{occupancyMedio}%</span>
						</div>
						<div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
							<div
								className="h-full bg-primary rounded-full"
								style={{ width: `${occupancyMedio}%` }}
							/>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-gray-400">
								Próximo horário livre
							</span>
							<span className="font-bold text-primary">{nextMedio}</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
