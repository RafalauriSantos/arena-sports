import { useState, useMemo } from "react";
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
import { useBookings } from "@/contexts/BookingsContext";
import { NewBookingModal } from "@/components/admin/NewBookingModal";
import { Booking } from "@/types/booking";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type PaymentStatus = "paid_full" | "paid_deposit" | "pending" | "blocked";

interface AdminBooking {
	id: string;
	time: string;
	date: string;
	field: string;
	teamName: string;
	captain: string;
	phone: string;
	totalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	paymentStatus: PaymentStatus;
	bookingId: string;
}

export default function AgendaMaster() {
	const { bookings, updateBooking, deleteBooking, timeSlots } = useBookings();
	const { toast } = useToast();
	const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(
		null
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

	const getStatusConfig = (status: PaymentStatus) => {
		switch (status) {
			case "paid_full":
				return {
					icon: CheckCircle,
					label: "Pago Total",
					color: "text-primary bg-primary/20 border-primary/30",
					dotColor: "bg-primary",
				};
			case "paid_deposit":
				return {
					icon: AlertCircle,
					label: "Sinal Pago",
					color: "text-warning bg-warning/20 border-warning/30",
					dotColor: "bg-warning",
				};
			case "pending":
				return {
					icon: XCircle,
					label: "Pendente",
					color: "text-destructive bg-destructive/20 border-destructive/30",
					dotColor: "bg-destructive",
				};
			case "blocked":
				return {
					icon: Ban,
					label: "Bloqueado",
					color: "text-muted-foreground bg-muted border-border",
					dotColor: "bg-muted-foreground",
				};
		}
	};

	// Convert bookings to admin format
	const adminBookingsData = useMemo((): AdminBooking[] => {
		const today = format(new Date(), "yyyy-MM-dd");

		return bookings
			.filter(
				(b) =>
					b.date === today &&
					(b.status === "confirmed" || b.status === "approved")
			)
			.map((b) => {
				const slot = timeSlots.find((s) => s.id === b.slotId);
				const totalAmount = b.pricePerPlayer * b.totalPlayers;

				// Determine payment amounts based on payment type and status
				let paidAmount = 0;
				let paymentStatus: PaymentStatus = "pending";

				if (b.paymentType === "pix") {
					// PIX: payment is immediate and full
					paidAmount = totalAmount;
					paymentStatus = "paid_full";
				} else {
					// Local payment
					if (b.status === "confirmed") {
						// Confirmed = paid full at the arena
						paidAmount = totalAmount;
						paymentStatus = "paid_full";
					} else if (b.status === "approved") {
						// Approved but not confirmed = approved to play, pending payment
						paidAmount = 0;
						paymentStatus = "pending";
					}
				}

				const remainingAmount = totalAmount - paidAmount;

				return {
					id: b.id,
					time: b.time,
					date: b.date,
					field: b.fieldName,
					teamName: b.bookedBy,
					captain: b.bookedBy,
					phone: "11999999999", // Mock - in real app would come from user data
					totalAmount,
					paidAmount,
					remainingAmount,
					paymentStatus:
						slot?.status === "reserved" && slot?.bookedBy?.includes("🔒")
							? "blocked"
							: paymentStatus,
					bookingId: b.id,
				};
			});
	}, [bookings, timeSlots]);
	const pendingApprovalBookings = useMemo((): AdminBooking[] => {
		const today = format(new Date(), "yyyy-MM-dd");

		return bookings
			.filter(
				(b) =>
					b.date === today &&
					b.status === "pending_approval" &&
					b.paymentType === "local"
			)
			.map((b) => {
				const totalAmount = b.pricePerPlayer * b.totalPlayers;

				return {
					id: b.id,
					time: b.time,
					date: b.date,
					field: b.fieldName,
					teamName: b.bookedBy,
					captain: b.bookedBy,
					phone: "11999999999",
					totalAmount,
					paidAmount: 0,
					remainingAmount: totalAmount,
					paymentStatus: "pending" as PaymentStatus,
					bookingId: b.id,
				};
			});
	}, [bookings]);
	const handleBookingClick = (booking: AdminBooking) => {
		setSelectedBooking(booking);
		setIsModalOpen(true);
	};

	const handleConfirmPayment = () => {
		if (!selectedBooking) return;

		updateBooking(selectedBooking.bookingId, { status: "confirmed" });

		toast({
			title: "Pagamento confirmado!",
			description: `${selectedBooking.captain} pagou o restante.`,
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

	const handleApproveBooking = () => {
		if (!selectedBooking) return;

		updateBooking(selectedBooking.bookingId, { status: "approved" });

		toast({
			title: "Reserva aprovada!",
			description: `${selectedBooking.captain} pode jogar no horário ${selectedBooking.time}.`,
		});

		setIsModalOpen(false);
	};

	const handleRejectBooking = () => {
		if (!selectedBooking) return;

		updateBooking(selectedBooking.bookingId, { status: "rejected" });
		deleteBooking(selectedBooking.bookingId);

		toast({
			title: "Reserva rejeitada",
			description: `Solicitação de ${selectedBooking.captain} foi recusada.`,
			variant: "destructive",
		});

		setIsModalOpen(false);
	};

	const handleWhatsApp = () => {
		if (selectedBooking) {
			window.open(`https://wa.me/55${selectedBooking.phone}`, "_blank");
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-black">Agenda Master</h1>
					<p className="text-muted-foreground">
						Torre de controle - Todos os agendamentos de hoje
					</p>
				</div>
				<Button
					size="lg"
					className="gap-2 glow-primary"
					onClick={() => setIsNewBookingOpen(true)}>
					<Plus className="h-5 w-5" />
					Novo Agendamento Manual
				</Button>
			</div>

			{/* New Booking Modal */}
			<NewBookingModal
				open={isNewBookingOpen}
				onOpenChange={setIsNewBookingOpen}
			/>
			{/* Pending Approvals */}
			{pendingApprovalBookings.length > 0 && (
				<Card className="border-warning bg-warning/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-warning">
							<AlertCircle className="h-5 w-5" />
							Reservas Pendentes de Aprovação ({pendingApprovalBookings.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{pendingApprovalBookings.map((booking) => (
								<div
									key={booking.id}
									className="flex items-center justify-between p-4 border rounded-lg bg-background">
									<div className="flex items-center gap-4">
										<div>
											<p className="font-bold">
												{booking.time} - {booking.field}
											</p>
											<p className="text-sm text-muted-foreground">
												{booking.teamName}
											</p>
										</div>
										<Badge
											variant="outline"
											className="bg-warning/10 text-warning border-warning">
											Pagar no Local
										</Badge>
										<p className="font-bold">
											R$ {booking.totalAmount.toFixed(2)}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											className="gap-2"
											onClick={() => handleBookingClick(booking)}>
											Detalhes
										</Button>
										<Button
											size="sm"
											variant="default"
											className="gap-2 glow-primary"
											onClick={() => {
												setSelectedBooking(booking);
												handleApproveBooking();
											}}>
											<CheckCircle className="h-4 w-4" />
											Aprovar
										</Button>
										<Button
											size="sm"
											variant="destructive"
											className="gap-2"
											onClick={() => {
												setSelectedBooking(booking);
												handleRejectBooking();
											}}>
											<XCircle className="h-4 w-4" />
											Rejeitar
										</Button>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
			{/* Bookings Grid */}
			<div className="grid gap-4 md:grid-cols-2">
				{adminBookingsData.map((booking) => {
					const statusConfig = getStatusConfig(booking.paymentStatus);
					const StatusIcon = statusConfig.icon;

					return (
						<Card
							key={booking.id}
							className={cn(
								"cursor-pointer transition-all hover:scale-[1.02] card-hover",
								statusConfig.color
							)}
							onClick={() => handleBookingClick(booking)}>
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div
											className={cn(
												"h-3 w-3 rounded-full animate-pulse",
												statusConfig.dotColor
											)}
										/>
										<div>
											<CardTitle className="text-lg">{booking.time}</CardTitle>
											<p className="text-sm text-muted-foreground">
												{booking.field}
											</p>
										</div>
									</div>
									<Badge
										variant="outline"
										className={cn("gap-1", statusConfig.color)}>
										<StatusIcon className="h-3 w-3" />
										{statusConfig.label}
									</Badge>
								</div>
							</CardHeader>

							<CardContent className="space-y-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="font-bold text-lg">{booking.teamName}</p>
										<p className="text-sm text-muted-foreground">
											Capitão: {booking.captain}
										</p>
									</div>
									<Button
										variant="outline"
										size="icon"
										className="flex-shrink-0"
										onClick={(e) => {
											e.stopPropagation();
											window.open(`https://wa.me/55${booking.phone}`, "_blank");
										}}>
										<MessageCircle className="h-4 w-4" />
									</Button>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-border">
									<div className="text-sm">
										<span className="text-muted-foreground">Total: </span>
										<span className="font-bold">
											R$ {booking.totalAmount.toFixed(2)}
										</span>
									</div>
									{booking.remainingAmount > 0 && (
										<div className="text-sm">
											<span className="text-warning">A receber: </span>
											<span className="font-bold text-warning">
												R$ {booking.remainingAmount.toFixed(2)}
											</span>
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
									Time
								</h4>
								<p className="text-lg font-bold">{selectedBooking.teamName}</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-1">
										Capitão
									</h4>
									<p className="font-medium">{selectedBooking.captain}</p>
								</div>
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-1">
										Telefone
									</h4>
									<p className="font-medium flex items-center gap-2">
										{selectedBooking.phone}
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
						</div>

						<DialogFooter className="flex-col gap-2 sm:flex-col">
							{selectedBooking.paymentStatus === "pending" &&
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
