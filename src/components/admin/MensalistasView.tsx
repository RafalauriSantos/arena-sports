import { Crown, Phone, Calendar, Clock } from "lucide-react";
import { Booking } from "@/types/booking";

interface MensalistasViewProps {
  mensalistas: Booking[];
}

export function MensalistasView({ mensalistas }: MensalistasViewProps) {
  if (mensalistas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <Crown className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum Mensalista
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Você ainda não tem jogadores mensalistas cadastrados. Marque um jogador como mensalista na aba "Hoje".
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-500" />
        Jogadores Mensalistas
      </h2>

      {mensalistas.map((booking) => (
        <div
          key={booking.id}
          className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-amber-500">{booking.bookedBy}</span>
            </div>
            <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full font-medium">
              FIXO
            </span>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {booking.fieldName}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {booking.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
