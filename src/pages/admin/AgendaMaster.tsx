import { useEffect, useMemo, useState } from "react";
import {
	Plus,
	MessageCircle,
	CheckCircle,
	AlertCircle,
	XCircle,
	Ban,
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
import { format } from "date-fns";

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
	const { bookings, updateBooking, deleteBooking, timeSlots } = useBookings();
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
		if (oldStatus && newStatus && oldStatus !== newStatus) {
			return `Status: ${oldStatus} → ${newStatus}`;
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
		const today = format(new Date(), "yyyy-MM-dd");

		return bookings
			.filter(
				(b) => b.date === today && b.status !== ("cancelled" as any) // compat
			)
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
				};
			});
	}, [bookings, timeSlots]);
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
			window.open(`https://wa.me/55${selectedBooking.phone}`, "_blank");
		}
	};

	return (
		<div className="space-y-4 md:space-y-6">
			{/* Header - Mobile responsive */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">
						Agenda Master
					</h1>
					<p className="text-xs md:text-sm text-gray-400 mt-1">
						Torre de controle - Agendamentos de hoje
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
			{/* Bookings Grid - Compact mobile cards */}
			{/* Bookings Grid - Compact mobile cards */}
			<div className="grid gap-2 md:gap-4 md:grid-cols-2">
				{adminBookingsData.map((booking) => {
					const statusConfig = getStatusConfig(booking.paymentStatus);
					const StatusIcon = statusConfig.icon;

					return (
						<Card
							key={booking.id}
							className={cn(
								"cursor-pointer transition-all hover:scale-[1.01] border backdrop-blur-md bg-gradient-to-br from-gray-900/50 to-gray-900/30 border-white/5 hover:border-white/10",
								statusConfig.color
							)}
							onClick={() => handleBookingClick(booking)}>
							<CardHeader className="p-3 md:p-4 pb-2 md:pb-3">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2 md:gap-3">
										<div
											className={cn(
												"h-2 w-2 md:h-3 md:w-3 rounded-full animate-pulse flex-shrink-0",
												statusConfig.dotColor
											)}
										/>
										<div>
											<CardTitle className="text-base md:text-lg text-white">
												{booking.time}
											</CardTitle>
											<p className="text-xs md:text-sm text-gray-400">
												{booking.field}
											</p>
										</div>
									</div>
									<Badge
										variant="outline"
										className={cn(
											"gap-1 text-xs border-white/10 bg-black/20",
											statusConfig.color
										)}>
										<StatusIcon className="h-3 w-3" />
										<span className="hidden md:inline">
											{statusConfig.label}
										</span>
									</Badge>
								</div>
							</CardHeader>

							<CardContent className="p-3 md:p-4 pt-0 space-y-2 md:space-y-3">
								<div className="flex items-center justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="font-bold text-sm md:text-lg truncate text-white">
											{booking.customerName}
										</p>
										{booking.phone ? (
											<p className="text-xs md:text-sm text-gray-400 truncate">
												{booking.phone}
											</p>
										) : (
											<p className="text-xs md:text-sm text-gray-500 truncate">
												Sem telefone
											</p>
										)}
									</div>
									<Button
										variant="outline"
										size="icon"
										className="flex-shrink-0 h-8 w-8 md:h-9 md:w-9 border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
										onClick={(e) => {
											e.stopPropagation();
											if (!booking.phone) return;
											window.open(`https://wa.me/55${booking.phone}`, "_blank");
										}}>
										<MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
									</Button>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
									<div className="text-xs md:text-sm text-gray-300">
										<span className="font-bold text-white">
											R$ {booking.totalAmount.toFixed(0)}
										</span>
									</div>
									{booking.remainingAmount > 0 && (
										<div className="text-xs md:text-sm text-amber-400 font-bold">
											Receber: R$ {booking.remainingAmount.toFixed(0)}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Detail Modal */}
			{selectedBooking && (
				<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
					<DialogContent className="sm:max-w-[500px]">
						<DialogHeader>
							<DialogTitle className="text-2xl">
								{selectedBooking.time} - {selectedBooking.field}
							</DialogTitle>
							<DialogDescription>
								Detalhes completos do agendamento
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-1">
									Cliente
								</h4>
								<p className="text-lg font-bold">
									{selectedBooking.customerName}
								</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-1">
										Telefone
									</h4>
									<p className="font-medium flex items-center gap-2">
										{selectedBooking.phone || "-"}
									</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-1">
										Pagamento
									</h4>
									<p className="font-medium">
										{selectedBooking.paymentStatus === "paid"
											? "Pago"
											: selectedBooking.paymentStatus === "deposit"
											? `Sinal${
													selectedBooking.depositPercent
														? ` (${selectedBooking.depositPercent}%)`
														: ""
											  }`
											: "Pendente"}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-1">
										Valor Total
									</h4>
									<p className="text-xl font-bold text-primary">
										R$ {selectedBooking.totalAmount.toFixed(2)}
									</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-1">
										Já Pago
									</h4>
									<p className="text-xl font-bold">
										R$ {selectedBooking.paidAmount.toFixed(2)}
									</p>
								</div>
								{selectedBooking.remainingAmount > 0 && (
									<div>
										<h4 className="text-sm font-medium text-muted-foreground mb-1">
											Falta Receber
										</h4>
										<p className="text-xl font-bold text-warning">
											R$ {selectedBooking.remainingAmount.toFixed(2)}
										</p>
									</div>
								)}
							</div>

							<div className="space-y-2 pt-2 border-t">
								<div className="flex items-center justify-between">
									<h4 className="text-sm font-medium text-muted-foreground">
										Histórico
									</h4>
									{bookingEventsLoading && (
										<span className="text-xs text-muted-foreground">
											Carregando...
										</span>
									)}
								</div>

								{bookingEventsError && (
									<p className="text-sm text-destructive">
										{bookingEventsError}
									</p>
								)}

								{!bookingEventsLoading &&
									!bookingEventsError &&
									bookingEvents.length === 0 && (
										<p className="text-sm text-muted-foreground">
											Nenhum evento registrado.
										</p>
									)}

								{bookingEvents.length > 0 && (
									<div className="space-y-2">
										{bookingEvents.map((event) => (
											<div
												key={event.id}
												className="flex items-start justify-between gap-3 rounded-md border bg-background/50 px-3 py-2">
												<div className="min-w-0">
													<p className="text-sm font-medium truncate">
														{summarizeEvent(event)}
													</p>
													<p className="text-xs text-muted-foreground">
														{format(new Date(event.created_at), "dd/MM HH:mm")}
													</p>
												</div>
												<Badge variant="outline" className="shrink-0">
													{formatEventAction(String(event.action))}
												</Badge>
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						<DialogFooter className="flex-col gap-2 sm:flex-col">
							{selectedBooking.paymentStatus !== "paid" &&
								selectedBooking.remainingAmount > 0 && (
									<Button
										size="lg"
										className="w-full gap-2 glow-primary"
										onClick={handleConfirmPayment}>
										<CheckCircle className="h-5 w-5" />
										Confirmar Pagamento Total (R${" "}
										{selectedBooking.totalAmount.toFixed(2)})
									</Button>
								)}

							<div className="grid grid-cols-2 gap-2 w-full">
								<Button
									variant="outline"
									className="gap-2"
									disabled={!selectedBooking.phone}
									onClick={handleWhatsApp}>
									<MessageCircle className="h-4 w-4" />
									WhatsApp
								</Button>
								<Button
									variant="destructive"
									className="gap-2"
									onClick={handleCancelBooking}>
									<XCircle className="h-4 w-4" />
									Cancelar
								</Button>
							</div>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
