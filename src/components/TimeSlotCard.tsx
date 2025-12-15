import { Lock, AlertCircle, ChevronRight } from "lucide-react";
import { TimeSlot } from "@/types/booking";
import { ARENA_CONFIG } from "@/config/arena";
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
        "w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-200 btn-press group",
        isAvailable && "bg-card border-2 border-primary/30 hover:border-primary hover:glow-primary cursor-pointer",
        isPending && "bg-warning/5 border-2 border-warning/40 cursor-not-allowed",
        isReserved && "bg-card/30 border border-border/50 cursor-not-allowed opacity-60"
      )}
    >
      {/* Left side - Time */}
      <div className="flex items-center gap-4">
        <div className={cn(
          "text-left",
          isAvailable && "text-foreground",
          isPending && "text-warning",
          isReserved && "text-muted-foreground"
        )}>
          <p className="text-2xl font-black number-display tracking-tight">
            {slot.time}
          </p>
        </div>
        
        {/* Status Badge */}
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold",
          isAvailable && "bg-primary/20 text-primary",
          isPending && "bg-warning/20 text-warning",
          isReserved && "bg-muted text-muted-foreground"
        )}>
          {isAvailable && "Disponível"}
          {isPending && (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Aguardando
            </span>
          )}
          {isReserved && (
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Reservado
            </span>
          )}
        </div>
      </div>
      
      {/* Right side - Price or Name */}
      <div className="flex items-center gap-3">
        {isAvailable && (
          <>
            <div className="text-right">
              <p className="text-2xl font-black text-primary number-display">
                R$ {price}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <ChevronRight className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
            </div>
          </>
        )}
        {(isPending || isReserved) && slot.bookedBy && (
          <p className={cn(
            "text-sm font-medium",
            isPending ? "text-warning/80" : "text-muted-foreground"
          )}>
            {slot.bookedBy}
          </p>
        )}
      </div>
    </button>
  );
}
