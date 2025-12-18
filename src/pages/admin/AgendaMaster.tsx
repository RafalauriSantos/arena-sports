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
                <div className="space-y-4 md:space-y-6">
                        {/* Header - Mobile responsive */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                        <h1 className="text-xl md:text-3xl font-black">Agenda Master</h1>
                                        <p className="text-xs md:text-sm text-muted-foreground">
                                                Torre de controle - Agendamentos de hoje
                                        </p>
                                </div>
                                <Button
                                        size="default"
                                        className="gap-2 glow-primary w-full md:w-auto"
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
                        {/* Pending Approvals - Mobile optimized */}
                        {pendingApprovalBookings.length > 0 && (
                                <Card className="border-warning bg-warning/5">
                                        <CardHeader className="pb-2 md:pb-4">
                                                <CardTitle className="flex items-center gap-2 text-warning text-sm md:text-base">
                                                        <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
                                                        Pendentes ({pendingApprovalBookings.length})
                                                </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                                <div className="space-y-2 md:space-y-3">
                                                        {pendingApprovalBookings.map((booking) => (
                                                                <div
                                                                        key={booking.id}
                                                                        className="p-3 md:p-4 border rounded-lg bg-background space-y-2 md:space-y-0">
                                                                        {/* Mobile: Stack layout / Desktop: Row layout */}
                                                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                                                                                {/* Info */}
                                                                                <div className="flex items-center justify-between md:flex-1">
                                                                                        <div className="flex-1">
                                                                                                <p className="font-bold text-sm md:text-base">
                                                                                                        {booking.time} - {booking.field}
                                                                                                </p>
                                                                                                <p className="text-xs md:text-sm text-muted-foreground">
                                                                                                        {booking.teamName}
                                                                                                </p>
                                                                                        </div>
                                                                                        <p className="font-bold text-sm md:text-base text-primary">
                                                                                                R$ {booking.totalAmount.toFixed(0)}
                                                                                        </p>
                                                                                </div>
                                                                                {/* Buttons - Always visible */}
                                                                                <div className="flex gap-2 w-full md:w-auto">
                                                                                        <Button
                                                                                                size="sm"
                                                                                                variant="default"
                                                                                                className="flex-1 md:flex-none gap-1 glow-primary text-xs md:text-sm"
                                                                                                onClick={() => {
                                                                                                        setSelectedBooking(booking);
                                                                                                        handleApproveBooking();
                                                                                                }}>
                                                                                                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                                                                                                Aprovar
                                                                                        </Button>
                                                                                        <Button
                                                                                                size="sm"
                                                                                                variant="destructive"
                                                                                                className="flex-1 md:flex-none gap-1 text-xs md:text-sm"
                                                                                                onClick={() => {
                                                                                                        setSelectedBooking(booking);
                                                                                                        handleRejectBooking();
                                                                                                }}>
                                                                                                <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                                                                                                Rejeitar
                                                                                        </Button>
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        ))}
                                                </div>
                                        </CardContent>
                                </Card>
                        )}
                        {/* Bookings Grid - Compact mobile cards */}
                        <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                                {adminBookingsData.map((booking) => {
                                        const statusConfig = getStatusConfig(booking.paymentStatus);
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                                <Card
                                                        key={booking.id}
                                                        className={cn(
                                                                "cursor-pointer transition-all hover:scale-[1.01] card-hover",
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
                                                                                        <CardTitle className="text-base md:text-lg">{booking.time}</CardTitle>
                                                                                        <p className="text-xs md:text-sm text-muted-foreground">
                                                                                                {booking.field}
                                                                                        </p>
                                                                                </div>
                                                                        </div>
                                                                        <Badge
                                                                                variant="outline"
                                                                                className={cn("gap-1 text-xs", statusConfig.color)}>
                                                                                <StatusIcon className="h-3 w-3" />
                                                                                <span className="hidden md:inline">{statusConfig.label}</span>
                                                                        </Badge>
                                                                </div>
                                                        </CardHeader>

                                                        <CardContent className="p-3 md:p-4 pt-0 space-y-2 md:space-y-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                        <div className="min-w-0 flex-1">
                                                                                <p className="font-bold text-sm md:text-lg truncate">{booking.teamName}</p>
                                                                                <p className="text-xs md:text-sm text-muted-foreground truncate">
                                                                                        {booking.captain}
                                                                                </p>
                                                                        </div>
                                                                        <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="flex-shrink-0 h-8 w-8 md:h-9 md:w-9"
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        window.open(`https://wa.me/55${booking.phone}`, "_blank");
                                                                                }}>
                                                                                <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
                                                                        </Button>
                                                                </div>

                                                                <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
                                                                        <div className="text-xs md:text-sm">
                                                                                <span className="font-bold">
                                                                                        R$ {booking.totalAmount.toFixed(0)}
                                                                                </span>
                                                                        </div>
                                                                        {booking.remainingAmount > 0 && (
                                                                                <div className="text-xs md:text-sm text-warning font-bold">
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
