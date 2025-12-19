import { useState } from "react";
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react";
import { Booking } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface BookingHistoryProps {
  bookings: Booking[];
  onBack: () => void;
  onCancelBooking: (bookingId: string) => void;
  onViewBooking: (booking: Booking) => void;
}

export function BookingHistory({ bookings, onBack, onCancelBooking, onViewBooking }: BookingHistoryProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const { toast } = useToast();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter future bookings
  const futureBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  }).sort((a, b) => {
    const dateA = new Date(a.date + 'T' + a.time);
    const dateB = new Date(b.date + 'T' + b.time);
    return dateA.getTime() - dateB.getTime();
  });

  // Filter past bookings
  const pastBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate < today;
  }).sort((a, b) => {
    const dateA = new Date(a.date + 'T' + a.time);
    const dateB = new Date(b.date + 'T' + b.time);
    return dateB.getTime() - dateA.getTime();
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getStatusInfo = (status: Booking["status"], paymentType: string) => {
    switch (status) {
      case "confirmed":
        return {
          icon: CheckCircle,
          text: "Confirmado",
          color: "text-primary",
          bgColor: "bg-primary/20"
        };
      case "pending_approval":
        return {
          icon: AlertCircle,
          text: "Aguardando aprovação",
          color: "text-warning",
          bgColor: "bg-warning/20"
        };
      case "approved":
        return {
          icon: CheckCircle,
          text: paymentType === "local" ? "Pagar no local" : "Aprovado",
          color: "text-primary",
          bgColor: "bg-primary/20"
        };
      case "rejected":
        return {
          icon: XCircle,
          text: "Recusado",
          color: "text-destructive",
          bgColor: "bg-destructive/20"
        };
      default:
        return {
          icon: AlertCircle,
          text: "Pendente",
          color: "text-muted-foreground",
          bgColor: "bg-muted"
        };
    }
  };

  const handleCancelClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (selectedBookingId) {
      onCancelBooking(selectedBookingId);
      toast({
        title: "Reserva cancelada",
        description: "Sua reserva foi cancelada com sucesso",
      });
    }
    setCancelDialogOpen(false);
    setSelectedBookingId(null);
  };

  const canCancel = (booking: Booking) => {
    const bookingDateTime = new Date(booking.date + 'T' + booking.time);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilBooking >= 24 && booking.status !== "rejected";
  };

  const BookingCard = ({ booking, isPast = false }: { booking: Booking; isPast?: boolean }) => {
    const statusInfo = getStatusInfo(booking.status, booking.paymentType);
    const StatusIcon = statusInfo.icon;
    const bookingCode = booking.id.toUpperCase().slice(0, 6).padStart(6, '0');

    return (
      <Card 
        className={cn(
          "p-4 border-border cursor-pointer transition-all hover:border-primary/50",
          isPast && "opacity-60"
        )}
        onClick={() => onViewBooking(booking)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", statusInfo.bgColor)}>
              <StatusIcon className={cn("w-4 h-4", statusInfo.color)} />
            </div>
            <span className={cn("text-sm font-medium", statusInfo.color)}>
              {statusInfo.text}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">#{bookingCode}</span>
        </div>

        <h3 className="font-bold text-foreground mb-2">{booking.fieldName}</h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{booking.time}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-sm">
            <span className="text-muted-foreground">Valor: </span>
            <span className="font-semibold text-foreground">
              R$ {(booking.pricePerPlayer * booking.totalPlayers).toFixed(2).replace(".", ",")}
            </span>
          </div>
          
          {!isPast && canCancel(booking) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelClick(booking.id);
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border p-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary btn-press">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Meus Agendamentos</h1>
        </div>
      </header>

      <div className="p-4 pb-28 md:pb-32 space-y-4 md:space-y-6">
        {/* Future Bookings */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Próximos Agendamentos
          </h2>
          
          {futureBookings.length > 0 ? (
            <div className="space-y-3">
              {futureBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <Card className="p-8 border-border text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum agendamento futuro</p>
              <Button variant="outline" className="mt-4" onClick={onBack}>
                Fazer uma reserva
              </Button>
            </Card>
          )}
        </section>

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico
            </h2>
            <div className="space-y-3">
              {pastBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} isPast />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação não pode ser desfeita. O horário ficará disponível novamente para outros jogadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
