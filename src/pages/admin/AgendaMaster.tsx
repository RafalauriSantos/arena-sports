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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useBookings } from "@/contexts/BookingsContext";
import { NewBookingModal } from "@/components/admin/NewBookingModal";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO } from "date-fns";
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

export default function AgendaMaster() {
	const context = useBookings();
	const { bookings, updateBooking, deleteBooking, refreshData } = context;
	const { toast } = useToast();
	const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(
		null
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
	const [bookingEvents, setBookingEvents] = useState<BookingEventRow[]>([]);
	const [bookingEventsLoading, setBookingEventsLoading] = useState(false);
	const [bookingEventsError, setBookingEventsError] = useState<string | null>(
		null
	);
	const [editedPhone, setEditedPhone] = useState("");
	const [savingPhone, setSavingPhone] = useState(false);
	const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

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
					"id, booking_id, actor_user_id, action, old_data, new_data, created_at"
				)
				.eq("booking_id", bookingId)
				.order("created_at", { ascending: false })
				.limit(20);

			if (cancelled) return;

			if (error) {
				setBookingEvents([]);
				setBookingEventsError(
					"Não foi possível carregar o histórico desta reserva."
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
				const paymentStatus: PaymentStatus = isPaidFull
					? "paid"
					: isDeposit
					? "deposit"
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
			};
			});
	}, [bookings]);

	// Removido: Logs excessivos estavam causando poluição no console

	const { pastBookings, todayBookings, tomorrowBookings, upcomingBookings } = useMemo(() => {
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

	const renderBookingCard = (booking: AdminBooking, showDate = false) => {
		const statusConfig = getStatusConfig(booking.paymentStatus);
		
		// Calcula horário de término se houver duração > 60min
		const endTimeDisplay = booking.endTime && booking.startTime && (() => {
			const duration = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60));
			if (duration > 60) {
				return format(booking.endTime, "HH:mm");
			}
			return null;
		})();

		// Status visual minimalista - apenas cor sutil
		const statusColor = 
			booking.paymentStatus === "paid" ? "border-l-emerald-500/50" :
			booking.paymentStatus === "deposit" ? "border-l-amber-500/50" :
			"border-l-gray-500/30";

		return (
			<Card
				key={booking.id}
				className={cn(
					"group cursor-pointer transition-all duration-300 ease-out",
					"border-l-4 border-r border-t border-b border-white/5",
					"bg-gray-900/40 backdrop-blur-sm",
					"hover:bg-gray-900/60 hover:border-white/10",
					"active:scale-[0.99]",
					statusColor
				)}
				onClick={() => handleBookingClick(booking)}>
				<CardContent className="p-6">
					{/* Linha 1: Horário + Status (minimalista) */}
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
						{/* Indicador de status - apenas ponto sutil */}
						<div className={cn(
							"w-2 h-2 rounded-full mt-2",
							booking.paymentStatus === "paid" ? "bg-emerald-500/60" :
							booking.paymentStatus === "deposit" ? "bg-amber-500/60" :
							"bg-gray-500/40"
						)} />
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
					{booking.remainingAmount > 0 ? (
						<div className="flex items-baseline gap-2 pt-3 border-t border-amber-500/20">
							<span className="text-xs text-amber-400/80 font-light">Falta receber</span>
							<span className="text-lg font-semibold text-amber-400">
								R$ {booking.remainingAmount.toFixed(0)}
							</span>
						</div>
					) : (
						<div className="flex items-center gap-2 pt-3 border-t border-white/5">
							<span className="text-xs text-gray-500 font-light">Pago</span>
						</div>
					)}
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
				description: error instanceof Error ? error.message : "Tente novamente.",
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
				selectedBooking.paymentStatus === "paid"
					? "Pago"
					: selectedBooking.paymentStatus === "deposit"
					? `Sinal de ${selectedBooking.depositPercent || 0}%`
					: "Pagar no local";
			const msg = `*Reserva Confirmada!*

Ola *${selectedBooking.customerName}*!

*Quadra:* ${selectedBooking.field}
*Data:* ${selectedBooking.date}
*Horario:* ${selectedBooking.time}
*Pagamento:* ${paymentLabel}

Nos vemos em breve! Qualquer duvida, e so responder aqui.`;
			window.open(
				`https://wa.me/55${selectedBooking.phone}?text=${encodeURIComponent(
					msg
				)}`,
				"_blank"
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

	return (
		<div className="space-y-4 md:space-y-6">
			{/* Header - Mobile responsive */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">
						Reservas
					</h1>
					<p className="text-xs md:text-sm text-gray-400 mt-1">
						Torre de controle - Anteriores / Hoje / Amanhã
					</p>
				</div>
				<Button
					size="default"
					className="gap-2 bg-primary text-white hover:bg-primary/90 w-full md:w-auto font-bold shadow-[0_0_20px_hsl(var(--primary)/0.5)] border-0 transition-all hover:scale-105"
					onClick={() => setIsNewBookingOpen(true)}>
					<Plus className="h-4 w-4" />
					<span className="md:hidden">Novo Agendamento</span>
					<span className="hidden md:inline">Novo Agendamento Manual</span>
				</Button>
			</div>

			{/* New Booking Modal */}
			<NewBookingModal
				open={isNewBookingOpen}
				onOpenChange={setIsNewBookingOpen}
			/>
			<div className="grid gap-3 md:gap-4">
				<Card className="border border-white/10 bg-black/20">
					<CardHeader className="p-3 md:p-4">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-white text-base md:text-lg">
								Jogos anteriores
							</CardTitle>
							<Badge variant="outline" className="border-white/10 bg-white/5">
								{pastBookings.length}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-3 md:p-4 pt-0">
						{pastBookings.length === 0 ? (
							<p className="text-sm text-gray-400">Nenhum jogo anterior.</p>
						) : (
							<div className="grid gap-2 md:gap-4 md:grid-cols-2">
								{pastBookings.map(renderBookingCard)}
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border border-white/10 bg-black/20">
					<CardHeader className="p-3 md:p-4">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-white text-base md:text-lg">
								Jogos do dia
							</CardTitle>
							<Badge variant="outline" className="border-white/10 bg-white/5">
								{todayBookings.length}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-3 md:p-4 pt-0">
						{todayBookings.length === 0 ? (
							<p className="text-sm text-gray-400">Nenhum jogo hoje.</p>
						) : (
							<div className="grid gap-2 md:gap-4 md:grid-cols-2">
								{todayBookings.map(renderBookingCard)}
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border border-white/10 bg-black/20">
					<CardHeader className="p-3 md:p-4">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-white text-base md:text-lg">
								Jogos de amanhã
							</CardTitle>
							<Badge variant="outline" className="border-white/10 bg-white/5">
								{tomorrowBookings.length}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-3 md:p-4 pt-0">
						{tomorrowBookings.length === 0 ? (
							<p className="text-sm text-gray-400">Nenhum jogo amanhã.</p>
						) : (
							<div className="grid gap-2 md:gap-4 md:grid-cols-2">
								{tomorrowBookings.map(renderBookingCard)}
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border border-white/10 bg-black/20">
					<CardHeader className="p-3 md:p-4">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-white text-base md:text-lg">
								Próximos jogos
							</CardTitle>
							<Badge variant="outline" className="border-white/10 bg-white/5">
								{upcomingBookings.length}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-3 md:p-4 pt-0">
						{upcomingBookings.length === 0 ? (
							<p className="text-sm text-gray-400">Nenhuma reserva agendada.</p>
						) : (
							<div className="grid gap-2 md:gap-4 md:grid-cols-2">
								{upcomingBookings.map((booking) => renderBookingCard(booking, true))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Detail Modal */}
			{selectedBooking && (
				<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
					<DialogContent className="w-[95vw] sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-gray-900/95 backdrop-blur-xl border border-white/10">
						{/* Header Minimalista */}
						<DialogHeader className="px-6 pt-8 pb-6">
							<div className="space-y-1">
								<DialogTitle className="text-3xl font-light text-white tracking-tight">
									{selectedBooking.time}
									{selectedBooking.endTime && selectedBooking.startTime && (() => {
										const duration = Math.round((selectedBooking.endTime.getTime() - selectedBooking.startTime.getTime()) / (1000 * 60));
										if (duration > 60) {
											const endTimeStr = format(selectedBooking.endTime, "HH:mm");
											return <span className="text-2xl text-gray-500 font-light ml-2">{endTimeStr}</span>;
										}
										return null;
									})()}
								</DialogTitle>
								<DialogDescription className="text-base text-gray-400 font-light">
									{selectedBooking.field}
								</DialogDescription>
							</div>
						</DialogHeader>

						<div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0 space-y-8">
							{/* Cliente - Minimalista */}
							<div className="space-y-3">
								<p className="text-sm text-gray-500 font-light uppercase tracking-wider">
									Cliente
								</p>
								<p className="text-xl font-medium text-white leading-tight">
									{selectedBooking.customerName}
								</p>
							</div>

							{/* Telefone - Editável */}
							<div className="space-y-3">
								<Label htmlFor="editPhone" className="text-sm text-gray-500 font-light uppercase tracking-wider">
									Telefone
								</Label>
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
									className="bg-gray-800/50 border-gray-700/50 text-white text-base font-light h-12 focus:border-primary/50 focus:bg-gray-800 transition-colors"
								/>
							</div>

							{/* Valores - Grid Minimalista */}
							<div className="grid grid-cols-3 gap-6 py-6 border-y border-white/5">
								<div>
									<p className="text-xs text-gray-500 font-light mb-2">Total</p>
									<p className="text-lg font-medium text-white">
										R$ {selectedBooking.totalAmount.toFixed(0)}
									</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 font-light mb-2">Pago</p>
									<p className="text-lg font-medium text-gray-400">
										R$ {selectedBooking.paidAmount.toFixed(0)}
									</p>
								</div>
								<div className={cn(
									selectedBooking.remainingAmount > 0 && "bg-amber-500/10 rounded-lg p-3 -m-3"
								)}>
									<p className={cn(
										"text-xs font-light mb-2",
										selectedBooking.remainingAmount > 0 ? "text-amber-400/90" : "text-gray-500"
									)}>
										Pendente
									</p>
									<p className={cn(
										"text-lg font-medium",
										selectedBooking.remainingAmount > 0 ? "text-amber-400" : "text-gray-500"
									)}>
										R$ {selectedBooking.remainingAmount.toFixed(0)}
									</p>
								</div>
							</div>

							{/* Status Pagamento - Sutil */}
							<div className="flex items-center gap-3">
								<div className={cn(
									"w-2 h-2 rounded-full",
									selectedBooking.paymentStatus === "paid" ? "bg-emerald-500/60" :
									selectedBooking.paymentStatus === "deposit" ? "bg-amber-500/60" :
									"bg-gray-500/40"
								)} />
								<p className="text-sm text-gray-400 font-light">
									{selectedBooking.paymentStatus === "paid" ? "Pagamento confirmado" :
									 selectedBooking.paymentStatus === "deposit" ? `Sinal ${selectedBooking.depositPercent ? `(${selectedBooking.depositPercent}%)` : ""}` :
									 "Aguardando pagamento"}
								</p>
							</div>

							{/* Histórico - Apenas se houver eventos */}
							{bookingEvents.length > 0 && (
								<div className="space-y-4 pt-4 border-t border-white/5">
									<p className="text-sm text-gray-500 font-light uppercase tracking-wider">
										Histórico
									</p>
									<div className="space-y-3">
										{bookingEvents.map((event) => (
											<div
												key={event.id}
												className="flex items-start gap-3 text-sm">
												<div className="w-1 h-1 rounded-full bg-gray-600 mt-2 flex-shrink-0" />
												<div className="flex-1 min-w-0">
													<p className="text-white/80 font-light">
														{summarizeEvent(event)}
													</p>
													<p className="text-xs text-gray-500 font-light mt-0.5">
														{format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Controle de Jogo - Minimalista */}
						{!selectedBooking.completedAt && !selectedBooking.cancelledAt && (
							<div className="px-6 py-4 border-t border-white/5">
								{selectedBooking.startedAt ? (
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-500 font-light">Tempo decorrido</span>
											<p className="text-2xl font-light text-white font-mono tracking-tight">
												{elapsedTime}
											</p>
										</div>
										<Button
											size="lg"
											className="w-full h-12 bg-emerald-600/90 hover:bg-emerald-600 text-white font-light text-base"
											onClick={handleCompleteGame}>
											Finalizar
										</Button>
									</div>
								) : (
									<Button
										size="lg"
										className="w-full h-12 bg-primary/90 hover:bg-primary text-white font-light text-base"
										onClick={handleStartGame}>
										Iniciar Jogo
									</Button>
								)}
							</div>
						)}

						{/* Footer Minimalista */}
						<DialogFooter className="flex items-center justify-between gap-3 flex-shrink-0 border-t border-white/5 px-6 py-4">
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									className="h-9 px-3 text-gray-400 hover:text-white hover:bg-white/5 font-light text-sm"
									disabled={savingPhone}
									onClick={handleSavePhone}>
									{savingPhone ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
									) : (
										"Salvar"
									)}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-9 px-3 text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/10 font-light text-sm"
									disabled={!selectedBooking.phone}
									onClick={handleWhatsApp}>
									WhatsApp
								</Button>
								{selectedBooking.paymentStatus !== "paid" &&
									selectedBooking.remainingAmount > 0 && (
										<Button
											size="sm"
											className="h-9 px-4 bg-primary/80 hover:bg-primary text-white font-light text-sm"
											onClick={handleConfirmPayment}>
											Confirmar Pagamento
										</Button>
									)}
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-9 px-3 text-gray-500 hover:text-red-400 hover:bg-red-500/10 font-light text-sm"
								onClick={handleCancelBooking}>
								Cancelar
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
