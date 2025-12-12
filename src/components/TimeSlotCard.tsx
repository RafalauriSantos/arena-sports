import { Lock, Clock, AlertCircle } from "lucide-react";
import { TimeSlot } from "@/types/booking";
import { ARENA_CONFIG, FieldId } from "@/config/arena";
import { cn } from "@/lib/utils";

interface TimeSlotCardProps {
  slot: TimeSlot;
  onClick: (slot: TimeSlot) => void;
}

export function TimeSlotCard({ slot, onClick }: TimeSlotCardProps) {
  const field = ARENA_CONFIG.fields.find((f) => f.id === slot.fieldId);
  const price = field?.priceLocal || 160;

  const isAvailable = slot.status === "available";
  const isPending = slot.status === "pending";
  const isReserved = slot.status === "reserved";

  return (
    <button
      onClick={() => isAvailable && onClick(slot)}
      disabled={!isAvailable}
      className={cn(
        "w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 btn-press",
        isAvailable && "bg-card border-2 border-primary/50 hover:border-primary hover:glow-primary cursor-pointer",
        isPending && "bg-warning/10 border-2 border-warning/50 cursor-not-allowed opacity-80",
        isReserved && "bg-card/50 border border-border cursor-not-allowed opacity-50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isAvailable && "bg-primary/20",
          isPending && "bg-warning/20",
          isReserved && "bg-muted"
        )}>
          {isAvailable && <Clock className="w-5 h-5 text-primary" />}
          {isPending && <AlertCircle className="w-5 h-5 text-warning" />}
          {isReserved && <Lock className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="text-left">
          <p className={cn(
            "font-semibold text-lg",
            isAvailable && "text-foreground",
            isPending && "text-warning",
            isReserved && "text-muted-foreground"
          )}>
            {slot.time}
          </p>
          <p className={cn(
            "text-sm",
            isAvailable && "text-primary",
            isPending && "text-warning/80",
            isReserved && "text-muted-foreground"
          )}>
            {isAvailable && "Disponível"}
            {isPending && "Aguardando Aprovação"}
            {isReserved && "Reservado"}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        {isAvailable && (
          <p className="font-bold text-lg text-primary">
            R$ {price.toFixed(2).replace('.', ',')}
          </p>
        )}
        {isPending && slot.bookedBy && (
          <p className="text-sm text-warning/80">{slot.bookedBy}</p>
        )}
        {isReserved && slot.bookedBy && (
          <p className="text-sm text-muted-foreground">{slot.bookedBy}</p>
        )}
      </div>
    </button>
  );
}
