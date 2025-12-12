import { Phone, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Booking } from "@/types/booking";

interface ApprovalCardProps {
  booking: Booking;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApprovalCard({ booking, onApprove, onReject }: ApprovalCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === tomorrow.toDateString()) return "Amanhã";
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });
  };

  return (
    <div className="mx-4 mb-4 p-4 rounded-xl bg-warning/10 border-2 border-warning animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-warning animate-ping" />
        <span className="text-warning font-semibold text-sm uppercase tracking-wide">
          Pedido de Reserva
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {formatDate(booking.date)}, {booking.time}
          </span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>{booking.fieldName}</span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span>
            {booking.bookedBy}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="destructive"
          className="flex-1 btn-press font-semibold"
          onClick={() => onReject(booking.id)}
        >
          RECUSAR
        </Button>
        <Button
          className="flex-1 btn-press font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => onApprove(booking.id)}
        >
          APROVAR RESERVA
        </Button>
      </div>
    </div>
  );
}
