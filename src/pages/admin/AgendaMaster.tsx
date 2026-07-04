import { useEffect, useMemo, useState } from "react";
import {
	Plus,
	MessageCircle,
	CheckCircle,
	Play,
	Clock,
	Loader2,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Zap,
	Users,
	CreditCard,
} from "lucide-react";
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
import {
	addDays,
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	parseISO,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeCustomerPhone } from "@/lib/phone";
import { formatPhoneInput, unformatPhone } from "@/lib/phoneFormat";
import {
	AdminEmptyState,
	AdminIconButton,
	AdminMetric,
	AdminPage,
	AdminPageHeader,
	AdminPanel,
	AdminPill,
	AdminSegmentedControl,
	AdminToolbar,
} from "@/components/admin/AdminUI";

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

type LooseQueryBuilder = {
	select: (columns: string) => LooseQueryBuilder;
	eq: (column: string, value: unknown) => LooseQueryBuilder;
	order: (column: string, options: { ascending: boolean }) => LooseQueryBuilder;
	limit: (count: number) => Promise<{ data: unknown; error: unknown }>;
};

const AgendaSkeleton = () => (
	<div className="space-y-6">
		<div className="h-16 w-full rounded-lg skeleton-premium" />
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
			{[1, 2, 3, 4, 5, 6].map((i) => (
				<div key={i} className="h-24 rounded-lg skeleton-premium" />
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
type ViewMode = "dia" | "semana" | "mes";

const VIEW_MODE_OPTIONS: Array<{ value: ViewMode; label: string }> = [
	{ value: "dia", label: "Dia" },
	{ value: "semana", label: "Semana" },
	{ value: "mes", label: "Mês" },
];

export default function AgendaMaster() {
	const context = useBookings();
	const { bookings, updateBooking, deleteBooking, refreshData, loading } =
		context;
	const supabaseLoose = useMemo(
		() =>
			supabase as unknown as {
				from: (table: string) => LooseQueryBuilder;
				rpc: (
					fn: string,
					args?: Record<string, unknown>,
				) => Promise<{ error: unknown; data?: unknown }>;
			},
		[],
	);
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
	const [viewStartDate, setViewStartDate] = useState(
		startOfWeek(new Date(), { weekStartsOn: 1 }),
	); // Início da janela de visualização
	const [preselectedSlot, setPreselectedSlot] = useState<string | null>(null);

	// Função para abrir os detalhes de uma reserva
	const handleViewDetails = (booking: AdminBooking) => {
		setSelectedBooking(booking);
		setIsModalOpen(true);
	};

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
		if (viewMode === "mes") {
			setViewStartDate(startOfMonth(selectedDate));
			return;
		}

		setViewStartDate(startOfWeek(selectedDate, { weekStartsOn: 1 }));
	}, [selectedDate, viewMode]);

	useEffect(() => {
		if (!isModalOpen || !selectedBooking) return;
		setEditedPhone(selectedBooking.phone || "");
	}, [isModalOpen, selectedBooking]);

	useEffect(() => {
		let cancelled = false;

		async function loadBookingEvents(bookingId: string) {
			setBookingEventsLoading(true);
			setBookingEventsError(null);

			const { data, error } = await supabaseLoose
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
	}, [isModalOpen, selectedBooking?.bookingId, supabaseLoose]);

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

	const weekDays = useMemo(() => {
		const weekStart = startOfWeek(viewStartDate, { weekStartsOn: 1 });
		return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
	}, [viewStartDate]);

	const monthDays = useMemo(() => {
		const monthStart = startOfMonth(viewStartDate);
		const monthEnd = endOfMonth(viewStartDate);
		const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
		const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
		return eachDayOfInterval({ start: gridStart, end: gridEnd });
	}, [viewStartDate]);

	const periodBookings = useMemo(() => {
		if (viewMode === "dia") return selectedDateBookings;

		if (viewMode === "mes") {
			const monthStart = startOfMonth(viewStartDate);
			const monthEnd = endOfMonth(viewStartDate);
			return adminBookingsData.filter((booking) => {
				const bookingDate = parseISO(booking.date);
				return bookingDate >= monthStart && bookingDate <= monthEnd;
			});
		}

		const weekStart = startOfWeek(viewStartDate, { weekStartsOn: 1 });
		const weekEnd = addDays(weekStart, 6);
		return adminBookingsData.filter((booking) => {
			const bookingDate = parseISO(booking.date);
			return bookingDate >= weekStart && bookingDate <= weekEnd;
		});
	}, [adminBookingsData, selectedDateBookings, viewMode, viewStartDate]);

	// Navegação por período
	const goToPrevWeek = () => {
		if (viewMode === "dia") {
			setSelectedDate((prev) => subDays(prev, 1));
			return;
		}

		if (viewMode === "mes") {
			setSelectedDate((prev) => subMonths(prev, 1));
			return;
		}

		setSelectedDate((prev) => subDays(prev, 7));
	};
	const goToNextWeek = () => {
		if (viewMode === "dia") {
			setSelectedDate((prev) => addDays(prev, 1));
			return;
		}

		if (viewMode === "mes") {
			setSelectedDate((prev) => addMonths(prev, 1));
			return;
		}

		setSelectedDate((prev) => addDays(prev, 7));
	};
	const goToToday = () => {
		setSelectedDate(new Date());
		setViewStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
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
			const { error } = await supabaseLoose.rpc("fn_start_booking", {
				p_booking_id: selectedBooking.bookingId,
			});

			if (error) throw error;

			// Atualiza o estado local imediatamente para o timer começar
			setSelectedBooking({
				...selectedBooking,
				startedAt: startTime,
			});

			toast({
				title: "Jogo iniciado",
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
			const { error } = await supabaseLoose.rpc("fn_complete_booking", {
				p_booking_id: selectedBooking.bookingId,
			});

			if (error) throw error;

			// Atualiza o estado local imediatamente para parar o timer
			setSelectedBooking({
				...selectedBooking,
				completedAt: completeTime,
			});

			toast({
				title: "Jogo finalizado",
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
	const periodTitle =
		viewMode === "mes" ?
			format(viewStartDate, "MMMM 'de' yyyy", { locale: ptBR })
		: viewMode === "semana" ?
			`${format(weekDays[0], "dd MMM", { locale: ptBR })} - ${format(
				weekDays[6],
				"dd MMM yyyy",
				{ locale: ptBR },
			)}`
		:	format(
				selectedDate,
				selectedDate.getFullYear() === new Date().getFullYear() ?
					"EEEE, dd 'de' MMMM"
				:	"EEEE, dd 'de' MMMM 'de' yyyy",
				{ locale: ptBR },
			);

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="Operação"
				title="Agenda"
				description={
					<span>
						{periodTitle}. Controle reservas, pagamentos e andamento dos jogos
						em uma tela única.
					</span>
				}
				meta={
					<>
						{isToday && <AdminPill tone="blue">Hoje</AdminPill>}
						{isTomorrow && <AdminPill tone="amber">Amanhã</AdminPill>}
						<AdminPill tone="slate">{periodBookings.length} reserva(s)</AdminPill>
					</>
				}
				actions={
					<Button
						size="default"
						className="h-10 gap-2 rounded-[var(--az-radius-control)] border-0 bg-[color:var(--az-navy)] font-medium text-white hover:bg-[color:var(--az-navy)]"
						onClick={() => setIsNewBookingOpen(true)}>
						<Plus className="h-4 w-4" />
						<span>Nova reserva</span>
					</Button>
				}
			/>

			<AdminToolbar>
				<AdminSegmentedControl
					value={viewMode}
					onChange={setViewMode}
					options={VIEW_MODE_OPTIONS}
				/>

				<div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto md:justify-end">
					<AdminIconButton aria-label="Periodo anterior" onClick={goToPrevWeek}>
						<ChevronLeft className="h-4 w-4" />
					</AdminIconButton>
					<button
						type="button"
						onClick={goToToday}
						className={cn(
							"h-9 shrink-0 rounded-md border px-3 text-sm font-semibold transition-colors",
							isToday ?
								"border-[color:var(--az-navy)] bg-[color:var(--az-navy)] text-white"
							:	"border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink-soft)] hover:bg-[color:var(--az-navy-soft)] hover:text-[color:var(--az-ink)]",
						)}>
						Hoje
					</button>
					<div className="flex min-w-max items-center gap-1.5">
						{viewMode === "mes" ?
							<div className="h-9 min-w-[176px] rounded-[var(--az-radius-control)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] px-3 py-2 text-center text-sm font-medium capitalize text-[color:var(--az-ink-soft)]">
								{format(viewStartDate, "MMMM yyyy", { locale: ptBR })}
							</div>
						:	[0, 1, 2, 3, 4, 5, 6].map((offset) => {
								const date = addDays(viewStartDate, offset);
								const isSelected = isSameDay(date, selectedDate);
								const dayIsToday = isSameDay(date, new Date());
								return (
									<button
										key={offset}
										type="button"
										onClick={() => setSelectedDate(date)}
										className={cn(
											"relative flex h-[58px] w-12 shrink-0 flex-col items-center justify-center rounded-md border transition-colors",
											isSelected ?
												"border-[color:var(--az-navy)] bg-[color:var(--az-navy)] text-white"
											: dayIsToday ?
												"border-[color:var(--az-line)] bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)]"
											:	"border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink-soft)] hover:bg-[color:var(--az-navy-soft)] hover:text-[color:var(--az-ink)]",
										)}>
										{dayIsToday && !isSelected && (
											<span className="absolute top-1 h-1 w-1 rounded-full bg-[color:var(--az-navy)]" />
										)}
										<span className="text-[9px] font-semibold uppercase leading-none opacity-70">
											{format(date, "EEE", { locale: ptBR })}
										</span>
										<span className="mt-1 text-base font-semibold leading-none">
											{format(date, "dd")}
										</span>
										<span className="mt-1 text-[9px] font-semibold uppercase leading-none opacity-70">
											{format(date, "MMM", { locale: ptBR })}
										</span>
									</button>
								);
							})
						}
					</div>
					<AdminIconButton aria-label="Proximo periodo" onClick={goToNextWeek}>
						<ChevronRight className="h-4 w-4" />
					</AdminIconButton>
				</div>
			</AdminToolbar>

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
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<AdminMetric
							label="Pagas"
							value={
								periodBookings.filter((b) => b.paymentStatus === "paid")
									.length
							}
							tone="turf"
							icon={<CheckCircle className="h-4 w-4" />}
						/>
						<AdminMetric
							label="A receber"
							value={
								periodBookings.filter(
									(b) =>
										b.paymentStatus === "deposit" ||
										b.paymentStatus === "pending",
								).length
							}
							tone="clay"
							icon={<Clock className="h-4 w-4" />}
						/>
						<AdminMetric
							label="Total no período"
							value={periodBookings.length}
							tone="muted"
							icon={<Zap className="h-4 w-4" />}
						/>
					</div>

					{/* Agenda Content */}
					{viewMode === "mes" ?
						<AdminPanel>
							<div className="space-y-4 p-3 md:p-4">
								<div className="grid grid-cols-7 gap-2 text-center text-xs uppercase text-slate-500">
									{["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map(
										(label) => (
											<div key={label} className="py-1">
												{label}
											</div>
										),
									)}
								</div>

								<div className="grid grid-cols-7 gap-2">
									{monthDays.map((day) => {
										const dateKey = format(day, "yyyy-MM-dd");
										const dayBookings = adminBookingsData.filter(
											(booking) => booking.date === dateKey,
										);
										const inCurrentMonth = isSameMonth(day, viewStartDate);
										const dayIsSelected = isSameDay(day, selectedDate);

										return (
											<button
												key={dateKey}
												onClick={() => {
													setSelectedDate(day);
													setViewMode("dia");
												}}
												className={cn(
													"min-h-[82px] rounded-md border p-2 text-left transition-colors",
													inCurrentMonth ?
														"bg-[color:var(--az-paper)] border-[color:var(--az-line)] hover:bg-[color:var(--az-navy-soft)]"
													:	"bg-[color:var(--az-surface)] border-[color:var(--az-line)] text-[color:var(--az-ink-soft)]",
													dayIsSelected &&
														"border-[color:var(--az-navy)] bg-[color:var(--az-navy-soft)]",
												)}>
												<div className="flex items-center justify-between">
													<span className="text-sm font-semibold">
														{format(day, "dd")}
													</span>
													{dayBookings.length > 0 && (
														<Badge className="border-[color:var(--az-line)] bg-[color:var(--az-navy-soft)] text-[10px] text-[color:var(--az-navy)] px-1.5 py-0.5">
															{dayBookings.length}
														</Badge>
													)}
												</div>
												{dayBookings[0] && (
													<p className="text-xs text-slate-500 mt-2 truncate">
														{dayBookings[0].time} -{" "}
														{dayBookings[0].customerName}
													</p>
													)}
												</button>
											);
										})}
								</div>
							</div>
						</AdminPanel>
					: viewMode === "semana" ?
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
							{weekDays.map((day) => {
								const dateKey = format(day, "yyyy-MM-dd");
								const dayBookings = periodBookings
									.filter((booking) => booking.date === dateKey)
									.sort((a, b) => a.time.localeCompare(b.time));
								const dayIsToday = isSameDay(day, new Date());
								const dayIsSelected = isSameDay(day, selectedDate);

								return (
									<AdminPanel
										key={dateKey}
										className={cn(
											"transition-colors",
											dayIsToday && "border-[color:var(--az-line)]",
											dayIsSelected && "ring-1 ring-[color:var(--az-line)]",
										)}>
										<div className="space-y-3 p-3">
											<div className="flex items-center justify-between">
												<div className="min-w-0">
													<p className="text-xs uppercase text-slate-500">
														{format(day, "EEE", { locale: ptBR })}
													</p>
													<p className="mt-1 text-lg font-semibold leading-none text-slate-950">
														{format(day, "dd MMM", { locale: ptBR })}
													</p>
												</div>
												<Badge className="border-slate-200 bg-slate-50 text-slate-600">
													{dayBookings.length} jogo(s)
												</Badge>
											</div>

											{dayBookings.length === 0 ?
												<div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
													<p className="text-sm text-slate-500">
														Sem jogos neste dia
													</p>
												</div>
											:	<div className="space-y-2">
													{dayBookings.slice(0, 4).map((booking) => (
														<button
															key={booking.id}
															onClick={() => handleViewDetails(booking)}
															className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-left transition-colors hover:bg-slate-50">
															<div className="flex items-start gap-2">
																<span
																	className={cn(
																		"mt-1 w-1.5 h-1.5 rounded-full shrink-0",
																		booking.paymentStatus === "paid" ?
																			"bg-[color:var(--az-turf)]"
																		: booking.paymentStatus === "deposit" ?
																			"bg-[color:var(--az-clay)]"
																		:	"bg-[color:var(--az-ink-soft)]",
																	)}
																/>
																<div className="min-w-0">
																	<p className="text-sm text-slate-900 font-medium truncate">
																		{booking.time} - {booking.customerName}
																	</p>
																	<p className="text-xs text-slate-500 truncate">
																		{booking.field}
																	</p>
																</div>
															</div>
														</button>
													))}
													{dayBookings.length > 4 && (
														<p className="text-xs text-slate-500">
															+{dayBookings.length - 4} jogo(s)
														</p>
													)}
												</div>
											}

											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													setSelectedDate(day);
													setViewMode("dia");
												}}
												className="w-full border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50">
												Ver dia
											</Button>
										</div>
									</AdminPanel>
								);
							})}
						</div>
					:	<AdminPanel>
							<div className="p-3 md:p-4">
								{selectedDateBookings.length === 0 ?
									<AdminEmptyState
										icon={<Calendar className="h-6 w-6" />}
										title={
											isPast ? "Nenhum jogo nesse dia" : "Sem reservas nesse dia"
										}
										description={
											isPast ?
												"Não houve reservas nessa data."
											: isToday ?
												"Nenhum jogo agendado para hoje. Crie uma reserva manual quando receber um pedido direto."
											:	"Use este horário para registrar uma nova reserva quando necessário."
										}
										action={
											!isPast ? (
											<Button
												onClick={() => setIsNewBookingOpen(true)}
												className="gap-2 rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] font-medium text-white hover:bg-[color:var(--az-navy)]">
												<Plus className="w-4 h-4" />
												Criar reserva
											</Button>
											) : null
										}
									/>
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
														className="group flex w-full items-center gap-4 rounded-md border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50 md:p-4">
														{/* Time */}
														<div className="flex-shrink-0 w-16 md:w-20">
															<p className="text-lg md:text-xl font-semibold text-slate-900">
																{booking.time}
															</p>
															{booking.endTime && (
																<p className="text-xs text-slate-500">
																	até {format(booking.endTime, "HH:mm")}
																</p>
															)}
														</div>

														{/* Status Indicator */}
														<div
															className={cn(
																"w-1.5 h-12 rounded-full flex-shrink-0",
																booking.paymentStatus === "paid" ?
																	"bg-[color:var(--az-turf)]"
																: booking.paymentStatus === "deposit" ?
																	"bg-[color:var(--az-clay)]"
																:	"bg-[color:var(--az-ink-soft)]",
															)}
														/>

														{/* Content */}
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<p className="font-medium text-slate-900 truncate">
																	{booking.customerName}
																</p>
																{booking.startedAt && !booking.completedAt && (
																	<Badge className="border-[color:var(--az-line)] bg-[color:var(--az-navy-soft)] text-[10px] text-[color:var(--az-navy)] px-1.5 py-0">
																		EM JOGO
																	</Badge>
																)}
															</div>
															<div className="flex items-center gap-3 text-sm text-slate-500">
																<span className="truncate">
																	{booking.field}
																</span>
																<span className="text-slate-400">•</span>
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
																		"bg-[#E8F1EA] text-[color:var(--az-turf)]"
																	: booking.paymentStatus === "deposit" ?
																		"bg-[#F5EAE0] text-[color:var(--az-clay)]"
																	:	"bg-[color:var(--az-navy-soft)] text-[color:var(--az-ink-soft)]",
																)}>
																{booking.paymentStatus === "paid" ?
																	"Pago"
																: booking.paymentStatus === "deposit" ?
																	`Sinal ${booking.depositPercent || 0}%`
																:	"Pendente"}
															</Badge>
														</div>

														{/* Arrow */}
														<ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
													</button>
												:	<button
														onClick={() => setIsNewBookingOpen(true)}
														className="group flex w-full items-center gap-4 rounded-md border border-dashed border-[color:var(--az-line)] p-3 text-left transition-colors hover:bg-[color:var(--az-navy-soft)]">
														<div className="flex-shrink-0 w-16 md:w-20">
															<p className="text-base font-medium text-slate-500 group-hover:text-slate-700">
																{time}
															</p>
														</div>
														<div className="w-1.5 h-8 rounded-full bg-slate-200 flex-shrink-0" />
														<div className="flex-1 min-w-0">
															<p className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
																Horário disponível
															</p>
														</div>
														<Plus className="w-4 h-4 text-slate-400 group-hover:text-[color:var(--az-navy)] transition-colors opacity-0 group-hover:opacity-100" />
													</button>
												}
											</div>
										))}
									</div>
								}
							</div>
						</AdminPanel>
					}
				</div>
			}

			{/* Detail Sheet (Drawer) */}
			{selectedBooking && (
				<Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
					<SheetContent className="flex h-full max-h-screen w-full flex-col border-l border-slate-200 bg-white p-0 sm:max-w-[440px]">
						{/* Header */}
						<SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-1 flex-1">
									<SheetTitle className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
										{selectedBooking.time}
										{selectedBooking.endTime && (
											<span className="text-lg text-slate-500 font-normal">
												→ {format(selectedBooking.endTime, "HH:mm")}
											</span>
										)}
									</SheetTitle>
									<SheetDescription className="text-sm text-slate-500">
										{selectedBooking.field}
									</SheetDescription>
								</div>
								<div className="flex items-center gap-2">
									{/* Botão WhatsApp - apenas ícone */}
									{selectedBooking.phone && (
										<button
											onClick={handleWhatsApp}
											className="rounded-md border border-[color:var(--az-line)] bg-[color:var(--az-navy-soft)] p-2.5 text-[color:var(--az-navy)] transition-colors hover:bg-[color:var(--az-navy-soft)]"
											title="Enviar mensagem no WhatsApp">
											<MessageCircle className="w-4 h-4" />
										</button>
									)}
									<Badge
										className={cn(
											"text-xs font-medium border-0",
											selectedBooking.paymentStatus === "paid" ?
												"bg-[#E8F1EA] text-[color:var(--az-turf)]"
											: selectedBooking.paymentStatus === "deposit" ?
												"bg-[#F5EAE0] text-[color:var(--az-clay)]"
											:	"bg-[color:var(--az-navy-soft)] text-[color:var(--az-ink-soft)]",
										)}>
										{selectedBooking.paymentStatus === "paid" ?
											"Pago"
										: selectedBooking.paymentStatus === "deposit" ?
											`Sinal ${selectedBooking.depositPercent || 0}%`
										:	"Pendente"}
									</Badge>
								</div>
							</div>
						</SheetHeader>

						<div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
							{/* Cliente */}
							<div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
								<div className="flex h-11 w-11 items-center justify-center rounded-md bg-[color:var(--az-navy-soft)]">
									<Users className="w-5 h-5 text-[color:var(--az-navy)]" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
										Cliente
									</p>
									<p className="text-base font-medium text-slate-900 truncate">
										{selectedBooking.customerName}
									</p>
								</div>
							</div>

							{/* Telefone - Editável */}
							<div className="space-y-2">
								<Label
									htmlFor="editPhone"
									className="text-xs text-slate-500 uppercase tracking-wider">
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
										className="h-10 flex-1 rounded-md border-slate-200 bg-white text-sm text-slate-900 transition-colors focus:border-[color:var(--az-navy)] focus:bg-white"
									/>
									<Button
										variant="outline"
										size="sm"
										className="h-10 rounded-md border-slate-200 px-4 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
								<div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
									<p className="text-xs text-slate-500 mb-1">Total</p>
									<p className="text-lg font-semibold text-slate-900">
										R$ {selectedBooking.totalAmount.toFixed(0)}
									</p>
								</div>
								<div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
									<p className="text-xs text-slate-500 mb-1">Pago</p>
									<p className="text-lg font-semibold text-slate-700">
										R$ {selectedBooking.paidAmount.toFixed(0)}
									</p>
								</div>
								<div
									className={cn(
										"rounded-lg border p-3 text-center",
										selectedBooking.remainingAmount > 0 ?
											"bg-[#F5EAE0] border-[color:var(--az-line)]"
										:	"bg-white border-slate-200",
									)}>
									<p
										className={cn(
											"text-xs mb-1",
											selectedBooking.remainingAmount > 0 ?
												"text-[color:var(--az-clay)]"
											:	"text-slate-500",
										)}>
										Pendente
									</p>
									<p
										className={cn(
											"text-lg font-semibold",
											selectedBooking.remainingAmount > 0 ?
												"text-[color:var(--az-clay)]"
											:	"text-slate-500",
										)}>
										R$ {selectedBooking.remainingAmount.toFixed(0)}
									</p>
								</div>
							</div>

							{/* Controle de Jogo */}
							{!selectedBooking.completedAt && !selectedBooking.cancelledAt && (
								<div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
									{selectedBooking.startedAt ?
										<>
											<div className="flex items-center justify-between">
												<span className="text-sm text-slate-500">
													Tempo decorrido
												</span>
												<p className="text-2xl font-semibold text-slate-900 font-mono tracking-tight">
													{elapsedTime}
												</p>
											</div>
											<Button
												size="lg"
												className="h-11 w-full rounded-md bg-slate-900 font-medium text-white hover:bg-slate-800"
												onClick={handleCompleteGame}>
												<CheckCircle className="w-4 h-4 mr-2" />
												Finalizar Jogo
											</Button>
										</>
									:	<Button
											size="lg"
											className="h-11 w-full rounded-md bg-[color:var(--az-navy)] font-medium text-white hover:bg-[color:var(--az-navy)]"
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
									<p className="text-xs text-slate-500 uppercase tracking-wider">
										Histórico
									</p>
									<div className="space-y-2">
										{bookingEvents.map((event) => (
											<div
												key={event.id}
												className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-sm">
												<div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
												<div className="flex-1 min-w-0">
													<p className="text-slate-700">
														{summarizeEvent(event)}
													</p>
													<p className="text-xs text-slate-500 mt-0.5">
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

						{/* Footer Actions - Simplificado */}
						<SheetFooter className="flex-col gap-2 border-t border-slate-200 px-6 py-4 flex-shrink-0">
							{selectedBooking.paymentStatus !== "paid" &&
								selectedBooking.remainingAmount > 0 && (
									<Button
										className="h-11 w-full rounded-md bg-[color:var(--az-navy)] font-medium text-white hover:bg-[color:var(--az-navy)]"
										onClick={handleConfirmPayment}>
										<CreditCard className="w-4 h-4 mr-2" />
										Confirmar Pagamento
									</Button>
								)}
							<Button
								variant="ghost"
								size="sm"
								className="h-10 w-full rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500"
								onClick={handleCancelBooking}>
								Cancelar Reserva
							</Button>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			)}
		</AdminPage>
	);
}
