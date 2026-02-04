import { useEffect, useMemo, useState } from "react";
import {
	Plus,
	MessageCircle,
	CheckCircle,
	AlertCircle,
	XCircle,
	Play,
	Square,
	Clock,
	Loader2,
	Calendar,
	ChevronLeft,
	ChevronRight,
	X,
	Zap,
	Users,
	CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useBookings } from "@/contexts/BookingsContext";
import { NewBookingModal } from "@/components/admin/NewBookingModal";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeCustomerPhone } from "@/lib/phone";
import { formatPhoneInput, unformatPhone } from "@/lib/phoneFormat";

type PaymentStatus = "paid" | "pending" | "deposit";

interface AdminBooking {
	id: string;
	time: string;
	date: string;
	field: string;
	customerName: string;
	phone: string;
	totalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	paymentStatus: PaymentStatus;
	depositPercent?: number;
	bookingId: string;
	startedAt?: string | null;
	completedAt?: string | null;
	cancelledAt?: string | null;
	startTime?: Date;
	endTime?: Date;
}

type BookingEventAction = "INSERT" | "UPDATE" | "DELETE";
type BookingEventData = {
	court_id?: string;
	start_time?: string;
	end_time?: string;
	status?: string;
	total_price?: number;
};

type BookingEventRow = {
	id: string;
	booking_id: string | null;
	actor_user_id: string | null;
	action: BookingEventAction | string;
	old_data: BookingEventData | null;
	new_data: BookingEventData | null;
	created_at: string;
};

const AgendaSkeleton = () => (
	<div className="space-y-6">
		<div className="h-16 w-full rounded-2xl skeleton-premium" />
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
			{[1, 2, 3, 4, 5, 6].map((i) => (
				<div key={i} className="h-24 rounded-xl skeleton-premium" />
			))}
		</div>
	</div>
);

// Horários padrão da arena (pode ser dinâmico depois)
const DEFAULT_SLOTS = [
	"06:00",
	"07:00",
	"08:00",
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
	"17:00",
	"18:00",
	"19:00",
	"20:00",
	"21:00",
	"22:00",
	"23:00",
];

// Tipo para visualização
type ViewMode = "dia" | "semana";

export default function AgendaMaster() {
	const context = useBookings();
	const { bookings, updateBooking, deleteBooking, refreshData, loading } =
		context;
	const { toast } = useToast();
	const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(
		null,
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
	const [bookingEvents, setBookingEvents] = useState<BookingEventRow[]>([]);
	const [bookingEventsLoading, setBookingEventsLoading] = useState(false);
	const [bookingEventsError, setBookingEventsError] = useState<string | null>(
		null,
	);
	const [editedPhone, setEditedPhone] = useState("");
	const [savingPhone, setSavingPhone] = useState(false);
	const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
	const [viewMode, setViewMode] = useState<ViewMode>("dia");
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [viewStartDate, setViewStartDate] = useState(new Date()); // Início da janela de 7 dias
	const [preselectedSlot, setPreselectedSlot] = useState<string | null>(null);

	// Timer em tempo real para mostrar tempo decorrido do jogo
	useEffect(() => {
		if (!selectedBooking?.startedAt || selectedBooking.completedAt) {
			setElapsedTime("00:00:00");
			return;
		}

		const updateTimer = () => {
			const startTime = new Date(selectedBooking.startedAt!);
			const now = new Date();
			const diff = now.getTime() - startTime.getTime();

			if (diff < 0) {
				setElapsedTime("00:00:00");
				return;
			}

			const hours = Math.floor(diff / (1000 * 60 * 60));
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((diff % (1000 * 60)) / 1000);

			const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
			setElapsedTime(formatted);
		};

		// Atualiza imediatamente
		updateTimer();

		// Atualiza a cada segundo
		const interval = setInterval(updateTimer, 1000);

		return () => clearInterval(interval);
	}, [selectedBooking?.startedAt, selectedBooking?.completedAt]);

	// Log quando bookings muda (apenas para debug, pode ser removido depois)
	useEffect(() => {
		// Log apenas quando há mudança significativa (nova reserva ou remoção)
		// Não logar em cada render para evitar poluição
	}, [bookings]);

	useEffect(() => {
		if (!isModalOpen || !selectedBooking) return;
		setEditedPhone(selectedBooking.phone || "");
	}, [isModalOpen, selectedBooking]);

	useEffect(() => {
		let cancelled = false;

		async function loadBookingEvents(bookingId: string) {
			setBookingEventsLoading(true);
			setBookingEventsError(null);

			const { data, error } = await supabase
				.from("booking_events")
				.select(
					"id, booking_id, actor_user_id, action, old_data, new_data, created_at",
				)
				.eq("booking_id", bookingId)
				.order("created_at", { ascending: false })
				.limit(20);

			if (cancelled) return;

			if (error) {
				setBookingEvents([]);
				setBookingEventsError(
					"Não foi possível carregar o histórico desta reserva.",
				);
				setBookingEventsLoading(false);
				return;
			}

			setBookingEvents((data || []) as BookingEventRow[]);
			setBookingEventsLoading(false);
		}

		if (!isModalOpen || !selectedBooking?.bookingId) {
			setBookingEvents([]);
			setBookingEventsError(null);
			setBookingEventsLoading(false);
			return;
		}

		loadBookingEvents(selectedBooking.bookingId);

		return () => {
			cancelled = true;
		};
	}, [isModalOpen, selectedBooking?.bookingId]);

	const formatEventAction = (action: string) => {
		switch (action) {
			case "INSERT":
				return "Criada";
			case "UPDATE":
				return "Atualizada";
			case "DELETE":
				return "Excluída";
			default:
				return action;
		}
	};

	const formatMaybeTime = (ts?: string) => {
		if (!ts) return null;
		const date = new Date(ts);
		if (Number.isNaN(date.getTime())) return null;
		return format(date, "HH:mm");
	};

	const summarizeEvent = (event: BookingEventRow) => {
		if (event.action === "INSERT") return "Reserva criada";
		if (event.action === "DELETE") return "Reserva removida";

		const oldStatus = event.old_data?.status;
		const newStatus = event.new_data?.status;

		// Mensagens amigáveis para mudanças de status do controle de jogo
		if (oldStatus && newStatus && oldStatus !== newStatus) {
			if (newStatus === "in_progress") {
				return "Jogo iniciado";
			}
			if (newStatus === "completed") {
				return "Jogo finalizado";
			}
			if (newStatus === "cancelled") {
				return "Reserva cancelada";
			}
			if (oldStatus === "pending_payment" && newStatus === "paid") {
				return "Pagamento confirmado";
			}
			if (oldStatus === "pending" && newStatus === "paid") {
				return "Pagamento confirmado";
			}
			// Para outras mudanças, mostra de forma genérica
			return `Status alterado: ${oldStatus} → ${newStatus}`;
		}

		const oldStart = formatMaybeTime(event.old_data?.start_time);
		const newStart = formatMaybeTime(event.new_data?.start_time);
		const oldEnd = formatMaybeTime(event.old_data?.end_time);
		const newEnd = formatMaybeTime(event.new_data?.end_time);
		if (
			(oldStart && newStart && oldStart !== newStart) ||
			(oldEnd && newEnd && oldEnd !== newEnd)
		) {
			return `Horário: ${oldStart || "?"}-${oldEnd || "?"} → ${
				newStart || "?"
			}-${newEnd || "?"}`;
		}

		const oldTotal = event.old_data?.total_price;
		const newTotal = event.new_data?.total_price;
		if (
			typeof oldTotal === "number" &&
			typeof newTotal === "number" &&
			oldTotal !== newTotal
		) {
			return `Valor: R$ ${oldTotal.toFixed(2)} → R$ ${newTotal.toFixed(2)}`;
		}

		return "Atualização";
	};

	const getStatusConfig = (status: PaymentStatus) => {
		switch (status) {
			case "paid":
				return {
					icon: CheckCircle,
					label: "Pago",
					color:
						"text-primary bg-primary/10 border-primary/20 hover:bg-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.1)]",
					dotColor: "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]",
				};
			case "pending":
				return {
					icon: XCircle,
					label: "Pendente",
					color:
						"text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20",
					dotColor: "bg-rose-500",
				};
			case "deposit":
				return {
					icon: AlertCircle,
					label: "Sinal",
					color:
						"text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
					dotColor: "bg-amber-500",
				};
		}
	};

	// Convert bookings to admin format
	const adminBookingsData = useMemo((): AdminBooking[] => {
		return bookings
			.filter((b) => b.status !== "cancelled") // compat
			.map((b) => {
				const totalAmount = b.totalPrice;
				const paidAmount = typeof b.paidAmount === "number" ? b.paidAmount : 0;
				const remainingAmount = totalAmount - paidAmount;
				const isPaidFull = b.paymentStatus === "paid";
				const isDeposit =
					!isPaidFull && paidAmount > 0 && paidAmount < totalAmount;
				const paymentStatus: PaymentStatus =
					isPaidFull ? "paid"
					: isDeposit ? "deposit"
					: "pending";

				return {
					id: b.id,
					time: b.time,
					date: b.date,
					field: b.fieldName,
					customerName: b.customerName,
					phone: b.customerPhone || "",
					totalAmount,
					paidAmount,
					remainingAmount,
					paymentStatus,
					depositPercent: b.depositPercent,
					bookingId: b.id,
					startedAt: b.startedAt,
					completedAt: b.completedAt,
					cancelledAt: b.cancelledAt,
					startTime: b.startTime,
					endTime: b.endTime,
				};
			});
	}, [bookings]);

	// Removido: Logs excessivos estavam causando poluição no console

	const { pastBookings, todayBookings, tomorrowBookings, upcomingBookings } =
		useMemo(() => {
			const today = format(new Date(), "yyyy-MM-dd");
			const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

			const sortTimeAsc = (a: AdminBooking, b: AdminBooking) =>
				a.time.localeCompare(b.time);

			const sortDateAscTimeAsc = (a: AdminBooking, b: AdminBooking) => {
				if (a.date !== b.date) return a.date.localeCompare(b.date);
				return a.time.localeCompare(b.time);
			};

			const sortDateDescTimeDesc = (a: AdminBooking, b: AdminBooking) => {
				if (a.date !== b.date) return b.date.localeCompare(a.date);
				return b.time.localeCompare(a.time);
			};

			const past = adminBookingsData
				.filter((b) => b.date < today)
				.sort(sortDateDescTimeDesc);
			const todayList = adminBookingsData
				.filter((b) => b.date === today)
				.sort(sortTimeAsc);
			const tomorrowList = adminBookingsData
				.filter((b) => b.date === tomorrow)
				.sort(sortTimeAsc);
			const upcoming = adminBookingsData
				.filter((b) => b.date > tomorrow)
				.sort(sortDateAscTimeAsc);

			return {
				pastBookings: past,
				todayBookings: todayList,
				tomorrowBookings: tomorrowList,
				upcomingBookings: upcoming,
			};
		}, [adminBookingsData]);

	// Bookings filtrados pela data selecionada
	const selectedDateBookings = useMemo(() => {
		const dateStr = format(selectedDate, "yyyy-MM-dd");
		return adminBookingsData
			.filter((b) => b.date === dateStr)
			.sort((a, b) => a.time.localeCompare(b.time));
	}, [adminBookingsData, selectedDate]);

	// Gera slots para a visualização
	const timeSlotGrid = useMemo(() => {
		const dateStr = format(selectedDate, "yyyy-MM-dd");
		const nowHour = new Date().getHours();
		const isToday = isSameDay(selectedDate, new Date());

		return DEFAULT_SLOTS.map((slot) => {
			const slotHour = parseInt(slot.split(":")[0]);
			const booking = selectedDateBookings.find((b) => b.time === slot);
			const isPast = isToday && slotHour < nowHour;

			return {
				time: slot,
				booking,
				isPast,
				isNow: isToday && slotHour === nowHour,
			};
		});
	}, [selectedDate, selectedDateBookings]);

	// Navegação de janela de visualização (move a strip de dias)
	const goToPrevWeek = () => setViewStartDate((prev) => subDays(prev, 7));
	const goToNextWeek = () => setViewStartDate((prev) => addDays(prev, 7));
	const goToToday = () => {
		setSelectedDate(new Date());
		setViewStartDate(new Date());
	};

	const renderBookingCard = (booking: AdminBooking, showDate = false) => {
		const statusConfig = getStatusConfig(booking.paymentStatus);

		// Calcula horário de término se houver duração > 60min
		const endTimeDisplay =
			booking.endTime &&
			booking.startTime &&
			(() => {
				const duration = Math.round(
					(booking.endTime.getTime() - booking.startTime.getTime()) /
						(1000 * 60),
				);
				if (duration > 60) {
					return format(booking.endTime, "HH:mm");
				}
				return null;
			})();

		// Status visual minimalista - apenas cor sutil
		const statusColor =
			booking.paymentStatus === "paid" ? "border-l-emerald-500/50"
			: booking.paymentStatus === "deposit" ? "border-l-amber-500/50"
			: "border-l-gray-500/30";

		return (
			<Card
				key={booking.id}
				className={cn(
					"group cursor-pointer transition-all duration-300 ease-out overflow-hidden",
					"border border-white/5 border-l-4 rounded-2xl",
					"bg-surface-2/60 backdrop-blur-sm",
					"hover:bg-surface-2/80 hover:border-white/10 hover:shadow-lg hover:shadow-black/20",
					"active:scale-[0.99]",
					statusColor,
				)}
				onClick={() => handleBookingClick(booking)}>
				<CardContent className="p-5 md:p-6">
					{/* Linha 1: Horário + Status (dot + label) */}
					<div className="flex items-start justify-between mb-4">
						<div className="flex items-baseline gap-3">
							<span className="text-2xl sm:text-3xl font-light text-white tracking-tight">
								{booking.time}
								{endTimeDisplay && (
									<span className="text-lg sm:text-xl text-gray-500 font-light ml-2">
										{endTimeDisplay}
									</span>
								)}
							</span>
						</div>
						<div
							className={cn(
								"flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border shrink-0",
								booking.paymentStatus === "paid" ?
									"bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
								: booking.paymentStatus === "deposit" ?
									"bg-amber-500/10 text-amber-400 border-amber-500/20"
								:	"bg-white/5 text-gray-400 border-white/10",
							)}>
							<span
								className={cn(
									"w-1.5 h-1.5 rounded-full shrink-0",
									booking.paymentStatus === "paid" ? "bg-emerald-500"
									: booking.paymentStatus === "deposit" ? "bg-amber-500"
									: "bg-gray-500",
								)}
							/>
							{booking.paymentStatus === "paid" ?
								"Pago"
							: booking.paymentStatus === "deposit" ?
								"Sinal"
							:	"Pendente"}
						</div>
					</div>

					{/* Linha 2: Cliente (essencial) */}
					<div className="mb-4">
						<p className="text-base sm:text-lg font-medium text-white/90 leading-tight">
							{booking.customerName}
						</p>
						<p className="text-sm text-gray-500 mt-1 font-light">
							{booking.field}
						</p>
					</div>

					{/* Linha 3: Valor (apenas se houver pendência) */}
					{booking.remainingAmount > 0 ?
						<div className="flex items-baseline gap-2 pt-3 border-t border-amber-500/20">
							<span className="text-xs text-amber-400/80 font-light">
								Falta receber
							</span>
							<span className="text-lg font-semibold text-amber-400">
								R$ {booking.remainingAmount.toFixed(0)}
							</span>
						</div>
					:	<div className="flex items-center gap-2 pt-3 border-t border-white/5">
							<span className="text-xs text-gray-500 font-light">Pago</span>
						</div>
					}
				</CardContent>
			</Card>
		);
	};
	const handleBookingClick = (booking: AdminBooking) => {
		setSelectedBooking(booking);
		setIsModalOpen(true);
	};

	const handleConfirmPayment = () => {
		if (!selectedBooking) return;

		updateBooking(selectedBooking.bookingId, { paymentStatus: "paid" });

		toast({
			title: "Pagamento confirmado!",
			description: `${selectedBooking.customerName} pagou o total.`,
		});

		setIsModalOpen(false);
	};

	const handleStartGame = async () => {
		if (!selectedBooking) return;

		const startTime = new Date().toISOString();

		try {
			// Usa a função SQL que contorna a constraint e garante consistência
			const { error } = await supabase.rpc("fn_start_booking", {
				p_booking_id: selectedBooking.bookingId,
			});

			if (error) throw error;

			// Atualiza o estado local imediatamente para o timer começar
			setSelectedBooking({
				...selectedBooking,
				startedAt: startTime,
			});

			toast({
				title: "🏁 Jogo iniciado!",
				description: `${selectedBooking.field} - ${selectedBooking.time}`,
			});

			// Atualiza o contexto em background
			refreshData();
		} catch (error) {
			console.error("Erro ao iniciar jogo:", error);
			toast({
				title: "Erro ao iniciar jogo",
				description:
					error instanceof Error ? error.message : "Tente novamente.",
				variant: "destructive",
			});
		}
	};

	const handleCompleteGame = async () => {
		if (!selectedBooking) return;

		const completeTime = new Date().toISOString();

		try {
			// Usa a função SQL que contorna a constraint e garante consistência
			const { error } = await supabase.rpc("fn_complete_booking", {
				p_booking_id: selectedBooking.bookingId,
			});

			if (error) throw error;

			// Atualiza o estado local imediatamente para parar o timer
			setSelectedBooking({
				...selectedBooking,
				completedAt: completeTime,
			});

			toast({
				title: "✅ Jogo finalizado!",
				description: `${selectedBooking.field} - ${selectedBooking.time}`,
			});

			// Atualiza o contexto
			await refreshData();
			setIsModalOpen(false);
		} catch (error) {
			console.error(error);
			toast({
				title: "Erro ao finalizar jogo",
				description: "Tente novamente.",
				variant: "destructive",
			});
		}
	};

	const handleCancelBooking = () => {
		if (!selectedBooking) return;

		deleteBooking(selectedBooking.bookingId);

		toast({
			title: "Agendamento cancelado",
			description: `Horário ${selectedBooking.time} liberado.`,
			variant: "destructive",
		});

		setIsModalOpen(false);
	};

	const handleWhatsApp = () => {
		if (selectedBooking?.phone) {
			const paymentLabel =
				selectedBooking.paymentStatus === "paid" ? "Pago"
				: selectedBooking.paymentStatus === "deposit" ?
					`Sinal de ${selectedBooking.depositPercent || 0}%`
				:	"Pagar no local";
			const msg = `*Reserva Confirmada!*

Ola *${selectedBooking.customerName}*!

*Quadra:* ${selectedBooking.field}
*Data:* ${selectedBooking.date}
*Horario:* ${selectedBooking.time}
*Pagamento:* ${paymentLabel}

Nos vemos em breve! Qualquer duvida, e so responder aqui.`;
			window.open(
				`https://wa.me/55${selectedBooking.phone}?text=${encodeURIComponent(
					msg,
				)}`,
				"_blank",
			);
		}
	};

	const handleSavePhone = async () => {
		if (!selectedBooking) return;
		setSavingPhone(true);
		try {
			await updateBooking(selectedBooking.bookingId, {
				customerPhone: unformatPhone(editedPhone),
			});
			toast({
				title: "Telefone atualizado",
				description: "Telefone salvo para contato via WhatsApp.",
			});
			setIsModalOpen(false);
		} finally {
			setSavingPhone(false);
		}
	};

	const isToday = isSameDay(selectedDate, new Date());
	const isTomorrow = isSameDay(selectedDate, new Date(Date.now() + 86400000));
	const isPast = selectedDate < new Date() && !isToday;

	return (
		<div className="space-y-4 md:space-y-6">
			{/* Header - Modern Command Center */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-4">
						<div>
							<h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
								Agenda de Jogos
							</h1>
							<p className="text-sm text-gray-500 mt-0.5">
								{format(
									selectedDate,
									selectedDate.getFullYear() === new Date().getFullYear() ?
										"EEEE, dd 'de' MMMM"
									:	"EEEE, dd 'de' MMMM 'de' yyyy",
									{ locale: ptBR },
								)}
								{isToday && (
									<span className="ml-2 text-emerald-400 font-medium">
										• Hoje
									</span>
								)}
								{isTomorrow && (
									<span className="ml-2 text-blue-400 font-medium">
										• Amanhã
									</span>
								)}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 md:gap-3">
						{/* View Toggle */}
						<div className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
							<button
								onClick={() => setViewMode("dia")}
								className={cn(
									"px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
									viewMode === "dia" ?
										"bg-primary text-white shadow-sm"
									:	"text-gray-400 hover:text-white",
								)}>
								Dia
							</button>
							<button
								onClick={() => setViewMode("semana")}
								className={cn(
									"px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
									viewMode === "semana" ?
										"bg-primary text-white shadow-sm"
									:	"text-gray-400 hover:text-white",
								)}>
								Semana
							</button>
						</div>
						<Button
							size="default"
							className="gap-2 bg-primary text-white hover:bg-primary/90 w-full md:w-auto font-bold shadow-[0_0_20px_hsl(var(--primary)/0.5)] border-0 transition-all hover:scale-105"
							onClick={() => setIsNewBookingOpen(true)}>
							<Plus className="h-4 w-4" />
							<span>Novo Agendamento</span>
						</Button>
					</div>
				</div>

				{/* Date Navigation Bar */}
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={goToPrevWeek}
						className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all flex-shrink-0 hover:scale-105 active:scale-95">
						<ChevronLeft className="w-5 h-5" />
					</button>
					<button
						onClick={goToToday}
						className={cn(
							"px-4 py-2 text-sm font-medium rounded-xl border transition-all flex-shrink-0 hover:scale-105 active:scale-95",
							isToday ?
								"bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10"
							:	"bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10",
						)}>
						Hoje
					</button>
					<div className="flex items-center gap-2">
						{[0, 1, 2, 3, 4, 5, 6].map((offset) => {
							const date = addDays(viewStartDate, offset);
							const isSelected = isSameDay(date, selectedDate);
							const dayIsToday = isSameDay(date, new Date());
							return (
								<button
									key={offset}
									onClick={() => setSelectedDate(date)}
									className={cn(
										"group relative flex flex-col items-center justify-center w-14 h-[72px] rounded-2xl border transition-all flex-shrink-0 hover:scale-105 active:scale-95",
										isSelected ?
											"bg-primary/20 border-primary/50 text-white shadow-lg shadow-primary/20"
										: dayIsToday ?
											"bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10"
										:	"bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5",
									)}>
									{/* Indicador de selecionado */}
									{isSelected && (
										<div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
									)}
									{/* Indicador de hoje */}
									{dayIsToday && !isSelected && (
										<div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
									)}
									<span className="text-[10px] uppercase font-medium opacity-50 group-hover:opacity-80 transition-opacity">
										{format(date, "EEE", { locale: ptBR })}
									</span>
									<span className="text-xl font-bold leading-tight">
										{format(date, "dd")}
									</span>
									<span
										className={cn(
											"text-[10px] uppercase font-medium leading-none mt-0.5",
											isSelected ? "text-primary/80" : "text-gray-500",
										)}>
										{format(date, "MMM", { locale: ptBR })}
									</span>
								</button>
							);
						})}
					</div>
					<button
						onClick={goToNextWeek}
						className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all flex-shrink-0 hover:scale-105 active:scale-95">
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* New Booking Modal */}
			<NewBookingModal
				open={isNewBookingOpen}
				onOpenChange={setIsNewBookingOpen}
				initialDate={selectedDate}
			/>
			{loading ?
				<AgendaSkeleton />
			:	<div className="space-y-4">
					{/* Summary Stats Row */}
					<div className="grid grid-cols-3 gap-3">
						<div className="flex items-center gap-3 p-4 bg-surface-2/60 border border-white/5 rounded-2xl">
							<div className="p-2.5 bg-emerald-500/10 rounded-xl">
								<CheckCircle className="w-5 h-5 text-emerald-400" />
							</div>
							<div>
								<p className="text-2xl font-semibold text-white">
									{
										selectedDateBookings.filter(
											(b) => b.paymentStatus === "paid",
										).length
									}
								</p>
								<p className="text-xs text-gray-500">Pagos</p>
							</div>
						</div>
						<div className="flex items-center gap-3 p-4 bg-surface-2/60 border border-white/5 rounded-2xl">
							<div className="p-2.5 bg-amber-500/10 rounded-xl">
								<Clock className="w-5 h-5 text-amber-400" />
							</div>
							<div>
								<p className="text-2xl font-semibold text-white">
									{
										selectedDateBookings.filter(
											(b) =>
												b.paymentStatus === "deposit" ||
												b.paymentStatus === "pending",
										).length
									}
								</p>
								<p className="text-xs text-gray-500">Pendentes</p>
							</div>
						</div>
						<div className="flex items-center gap-3 p-4 bg-surface-2/60 border border-white/5 rounded-2xl">
							<div className="p-2.5 bg-primary/10 rounded-xl">
								<Zap className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="text-2xl font-semibold text-white">
									{selectedDateBookings.length}
								</p>
								<p className="text-xs text-gray-500">Total</p>
							</div>
						</div>
					</div>

					{/* Time Slot Grid */}
					<Card className="border border-white/5 rounded-2xl bg-surface-2/60 overflow-hidden">
						<CardContent className="p-4 md:p-5">
							{selectedDateBookings.length === 0 ?
								<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
									<div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
										<Calendar className="w-10 h-10 text-primary" />
									</div>
									<h3 className="text-xl font-semibold text-white mb-2">
										{isPast ? "Nenhum jogo nesse dia" : "Agenda livre!"}
									</h3>
									<p className="text-sm text-gray-400 mb-6 max-w-sm">
										{isPast ?
											"Não houve reservas nessa data."
										: isToday ?
											"Nenhum jogo agendado para hoje. Que tal compartilhar seu link ou criar uma reserva?"
										:	"Esse dia está disponível para novos jogos."}
									</p>
									{!isPast && (
										<Button
											onClick={() => setIsNewBookingOpen(true)}
											className="gap-2 bg-primary text-white hover:bg-primary/90 font-medium shadow-lg shadow-primary/30 transition-all hover:scale-105">
											<Plus className="w-4 h-4" />
											Agendar primeiro jogo
										</Button>
									)}
								</div>
							:	<div className="space-y-2">
									{timeSlotGrid.map(({ time, booking }) => (
										<div
											key={time}
											className={cn(
												"relative group transition-all",
												booking ? "" : "opacity-50 hover:opacity-100",
											)}>
											{booking ?
												<button
													onClick={() => handleViewDetails(booking)}
													className="w-full flex items-center gap-4 p-3 md:p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all text-left group">
													{/* Time */}
													<div className="flex-shrink-0 w-16 md:w-20">
														<p className="text-lg md:text-xl font-semibold text-white">
															{booking.time}
														</p>
														{booking.endTime && (
															<p className="text-xs text-gray-500">
																até {format(booking.endTime, "HH:mm")}
															</p>
														)}
													</div>

													{/* Status Indicator */}
													<div
														className={cn(
															"w-1.5 h-12 rounded-full flex-shrink-0",
															booking.paymentStatus === "paid" ?
																"bg-emerald-500"
															: booking.paymentStatus === "deposit" ?
																"bg-amber-500"
															:	"bg-gray-500",
														)}
													/>

													{/* Content */}
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 mb-1">
															<p className="font-medium text-white truncate">
																{booking.customerName}
															</p>
															{booking.startedAt && !booking.completedAt && (
																<Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] px-1.5 py-0">
																	EM JOGO
																</Badge>
															)}
														</div>
														<div className="flex items-center gap-3 text-sm text-gray-400">
															<span className="truncate">{booking.field}</span>
															<span className="text-gray-600">•</span>
															<span>R$ {booking.totalAmount.toFixed(0)}</span>
														</div>
													</div>

													{/* Payment Badge */}
													<div className="flex-shrink-0 hidden md:block">
														<Badge
															variant="outline"
															className={cn(
																"text-xs font-medium border-0",
																booking.paymentStatus === "paid" ?
																	"bg-emerald-500/10 text-emerald-400"
																: booking.paymentStatus === "deposit" ?
																	"bg-amber-500/10 text-amber-400"
																:	"bg-gray-500/10 text-gray-400",
															)}>
															{booking.paymentStatus === "paid" ?
																"Pago"
															: booking.paymentStatus === "deposit" ?
																`Sinal ${booking.depositPercent || 0}%`
															:	"Pendente"}
														</Badge>
													</div>

													{/* Arrow */}
													<ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
												</button>
											:	<button
													onClick={() => setIsNewBookingOpen(true)}
													className="w-full flex items-center gap-4 p-3 rounded-xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
													<div className="flex-shrink-0 w-16 md:w-20">
														<p className="text-base font-medium text-gray-500 group-hover:text-gray-400">
															{time}
														</p>
													</div>
													<div className="w-1.5 h-8 rounded-full bg-white/5 flex-shrink-0" />
													<div className="flex-1 min-w-0">
														<p className="text-sm text-gray-600 group-hover:text-gray-400 transition-colors">
															Horário disponível
														</p>
													</div>
													<Plus className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
												</button>
											}
										</div>
									))}
								</div>
							}
						</CardContent>
					</Card>
				</div>
			}

			{/* Detail Sheet (Drawer) */}
			{selectedBooking && (
				<Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
					<SheetContent className="w-full sm:max-w-[440px] p-0 overflow-hidden bg-gray-900/98 backdrop-blur-xl border-l border-white/10">
						{/* Header */}
						<SheetHeader className="px-6 pt-6 pb-4 border-b border-white/5">
							<div className="flex items-start justify-between">
								<div className="space-y-1">
									<SheetTitle className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
										{selectedBooking.time}
										{selectedBooking.endTime && (
											<span className="text-lg text-gray-500 font-normal">
												→ {format(selectedBooking.endTime, "HH:mm")}
											</span>
										)}
									</SheetTitle>
									<SheetDescription className="text-sm text-gray-400">
										{selectedBooking.field}
									</SheetDescription>
								</div>
								<Badge
									className={cn(
										"text-xs font-medium border-0",
										selectedBooking.paymentStatus === "paid" ?
											"bg-emerald-500/20 text-emerald-400"
										: selectedBooking.paymentStatus === "deposit" ?
											"bg-amber-500/20 text-amber-400"
										:	"bg-gray-500/20 text-gray-400",
									)}>
									{selectedBooking.paymentStatus === "paid" ?
										"Pago"
									: selectedBooking.paymentStatus === "deposit" ?
										`Sinal ${selectedBooking.depositPercent || 0}%`
									:	"Pendente"}
								</Badge>
							</div>
						</SheetHeader>

						<div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 space-y-6">
							{/* Cliente */}
							<div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
								<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
									<Users className="w-5 h-5 text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
										Cliente
									</p>
									<p className="text-base font-medium text-white truncate">
										{selectedBooking.customerName}
									</p>
								</div>
							</div>

							{/* Telefone - Editável */}
							<div className="space-y-2">
								<Label
									htmlFor="editPhone"
									className="text-xs text-gray-500 uppercase tracking-wider">
									Telefone
								</Label>
								<div className="flex gap-2">
									<Input
										id="editPhone"
										placeholder="(11) 99999-9999"
										autoComplete="tel"
										inputMode="numeric"
										maxLength={15}
										required
										value={editedPhone}
										onChange={(e) => {
											const formatted = formatPhoneInput(e.target.value);
											setEditedPhone(formatted);
										}}
										className="flex-1 bg-white/5 border-white/10 text-white text-sm h-10 focus:border-primary/50 focus:bg-white/10 transition-colors rounded-xl"
									/>
									<Button
										variant="outline"
										size="sm"
										className="h-10 px-4 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
										disabled={savingPhone}
										onClick={handleSavePhone}>
										{savingPhone ?
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										:	"Salvar"}
									</Button>
								</div>
							</div>

							{/* Valores */}
							<div className="grid grid-cols-3 gap-3">
								<div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-center">
									<p className="text-xs text-gray-500 mb-1">Total</p>
									<p className="text-lg font-semibold text-white">
										R$ {selectedBooking.totalAmount.toFixed(0)}
									</p>
								</div>
								<div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-center">
									<p className="text-xs text-gray-500 mb-1">Pago</p>
									<p className="text-lg font-semibold text-gray-400">
										R$ {selectedBooking.paidAmount.toFixed(0)}
									</p>
								</div>
								<div
									className={cn(
										"p-3 rounded-xl border text-center",
										selectedBooking.remainingAmount > 0 ?
											"bg-amber-500/10 border-amber-500/20"
										:	"bg-white/[0.02] border-white/5",
									)}>
									<p
										className={cn(
											"text-xs mb-1",
											selectedBooking.remainingAmount > 0 ?
												"text-amber-400/80"
											:	"text-gray-500",
										)}>
										Pendente
									</p>
									<p
										className={cn(
											"text-lg font-semibold",
											selectedBooking.remainingAmount > 0 ?
												"text-amber-400"
											:	"text-gray-500",
										)}>
										R$ {selectedBooking.remainingAmount.toFixed(0)}
									</p>
								</div>
							</div>

							{/* Controle de Jogo */}
							{!selectedBooking.completedAt && !selectedBooking.cancelledAt && (
								<div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-4">
									{selectedBooking.startedAt ?
										<>
											<div className="flex items-center justify-between">
												<span className="text-sm text-gray-400">
													Tempo decorrido
												</span>
												<p className="text-2xl font-semibold text-white font-mono tracking-tight">
													{elapsedTime}
												</p>
											</div>
											<Button
												size="lg"
												className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl"
												onClick={handleCompleteGame}>
												<CheckCircle className="w-4 h-4 mr-2" />
												Finalizar Jogo
											</Button>
										</>
									:	<Button
											size="lg"
											className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-lg shadow-primary/30"
											onClick={handleStartGame}>
											<Play className="w-4 h-4 mr-2" />
											Iniciar Jogo
										</Button>
									}
								</div>
							)}

							{/* Histórico */}
							{bookingEvents.length > 0 && (
								<div className="space-y-3">
									<p className="text-xs text-gray-500 uppercase tracking-wider">
										Histórico
									</p>
									<div className="space-y-2">
										{bookingEvents.map((event) => (
											<div
												key={event.id}
												className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg text-sm">
												<div className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5 flex-shrink-0" />
												<div className="flex-1 min-w-0">
													<p className="text-white/80">
														{summarizeEvent(event)}
													</p>
													<p className="text-xs text-gray-500 mt-0.5">
														{format(
															new Date(event.created_at),
															"dd/MM 'às' HH:mm",
															{ locale: ptBR },
														)}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Footer Actions */}
						<SheetFooter className="flex-col gap-3 border-t border-white/5 px-6 py-4">
							<div className="flex gap-2 w-full">
								<Button
									variant="outline"
									className="flex-1 h-10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
									disabled={!selectedBooking.phone}
									onClick={handleWhatsApp}>
									<MessageCircle className="w-4 h-4 mr-2" />
									WhatsApp
								</Button>
								{selectedBooking.paymentStatus !== "paid" &&
									selectedBooking.remainingAmount > 0 && (
										<Button
											className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl"
											onClick={handleConfirmPayment}>
											<CreditCard className="w-4 h-4 mr-2" />
											Confirmar Pagamento
										</Button>
									)}
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="w-full h-9 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
								onClick={handleCancelBooking}>
								Cancelar Reserva
							</Button>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			)}
		</div>
	);
}
