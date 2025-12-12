import { Calendar, Clock, Crown, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Booking } from "@/types/booking";

interface SlotDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onMarkAsPaid?: () => void;
  onCancel?: () => void;
  onToggleMensalista?: () => void;
}

export function SlotDetailsModal({
  open,
  onOpenChange,
  booking,
  onMarkAsPaid,
  onCancel,
  onToggleMensalista,
}: SlotDetailsModalProps) {
  if (!booking) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const isPending = booking.status === "pending_approval";
  const amount = booking.pricePerPlayer * booking.totalPlayers;
  const isPayOnSite = booking.paymentType === "local";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            Detalhes da Reserva
            {booking.isMensalista && (
              <Crown className="w-5 h-5 text-amber-500" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 text-foreground">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{booking.bookedBy}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-foreground">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <p>{formatDate(booking.date)}</p>
          </div>

          <div className="flex items-center gap-3 text-foreground">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <p>{booking.time}</p>
          </div>

          <div className="flex items-center gap-3 text-foreground">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <p>{booking.fieldName}</p>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pagamento</span>
              <span className={`font-medium ${booking.paymentType === "pix" ? "text-primary" : "text-warning"}`}>
                {booking.paymentType === "pix" ? "Pix Confirmado" : "Pagar no Local"}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-bold text-foreground">
                R$ {amount.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isPending && isPayOnSite && onMarkAsPaid && (
            <Button
              onClick={onMarkAsPaid}
              className="w-full btn-press bg-primary text-primary-foreground"
            >
              Marcar como Pago
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onToggleMensalista}
            className="w-full btn-press border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
          >
            <Crown className="w-4 h-4 mr-2" />
            {booking.isMensalista ? "Remover Mensalista" : "Tornar Mensalista (Fixo)"}
          </Button>

          <Button
            variant="destructive"
            onClick={onCancel}
            className="w-full btn-press"
          >
            Cancelar Reserva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
