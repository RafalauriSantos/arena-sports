import { CheckCircle, XCircle, Clock, DollarSign, Users, ArrowLeft, Zap } from "lucide-react";
import { Booking } from "@/types/booking";
import { ARENA_CONFIG } from "@/config/arena";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminDashboardProps {
  bookings: Booking[];
  onApprove: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
  onBack: () => void;
}

export function AdminDashboard({ bookings, onApprove, onReject, onBack }: AdminDashboardProps) {
  const pendingBookings = bookings.filter(b => b.status === "pending_approval");
  const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "approved");

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors btn-press"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingBookings.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">Confirmados</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{confirmedBookings.length}</p>
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Aguardando Aprovação
            </h2>
            <div className="space-y-3">
              {pendingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 rounded-xl bg-card border border-warning/30 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{booking.bookedBy}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.date)} às {booking.time}
                      </p>
                      <p className="text-sm text-primary">{booking.fieldName}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20">
                      <DollarSign className="w-3 h-3 text-warning" />
                      <span className="text-xs font-medium text-warning">Pagar no Local</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{booking.players.length}/{booking.totalPlayers} jogadores confirmados</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => onApprove(booking.id)}
                      className="h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold btn-press"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => onReject(booking.id)}
                      variant="outline"
                      className="h-12 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold btn-press"
                    >
                      <XCircle className="w-5 h-5" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed Bookings */}
        {confirmedBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Reservas Confirmadas
            </h2>
            <div className="space-y-3">
              {confirmedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 rounded-xl bg-card border border-primary/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{booking.bookedBy}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.date)} às {booking.time}
                      </p>
                      <p className="text-sm text-primary">{booking.fieldName}</p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full",
                      booking.paymentType === "pix" ? "bg-primary/20" : "bg-muted"
                    )}>
                      {booking.paymentType === "pix" ? (
                        <>
                          <Zap className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-primary">Pix Recebido</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Aprovado</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{booking.players.length}/{booking.totalPlayers} jogadores</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bookings.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhuma reserva ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}
