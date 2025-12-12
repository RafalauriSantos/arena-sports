import { Check, CheckCheck, Crown, Lock, MoreVertical, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SlotStatus = "available" | "blocked" | "pix_confirmed" | "local_pending" | "mensalista";

interface AdminSlotCardProps {
  time: string;
  status: SlotStatus;
  customerName?: string;
  customerPhone?: string;
  onBlock?: () => void;
  onUnblock?: () => void;
  onViewDetails?: () => void;
  onMarkAsPaid?: () => void;
  onCancel?: () => void;
}

export function AdminSlotCard({
  time,
  status,
  customerName,
  customerPhone,
  onBlock,
  onUnblock,
  onViewDetails,
  onMarkAsPaid,
  onCancel,
}: AdminSlotCardProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "available":
        return "bg-card border-border";
      case "blocked":
        return "bg-muted/50 border-muted";
      case "pix_confirmed":
        return "bg-primary/10 border-primary/50";
      case "local_pending":
        return "bg-warning/10 border-warning/50";
      case "mensalista":
        return "bg-amber-500/10 border-amber-500/50";
      default:
        return "bg-card border-border";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "blocked":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      case "pix_confirmed":
        return <CheckCheck className="w-5 h-5 text-primary" />;
      case "local_pending":
        return <Check className="w-5 h-5 text-warning" />;
      case "mensalista":
        return <Crown className="w-5 h-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "available":
        return null;
      case "blocked":
        return (
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Bloqueado pelo Dono
          </span>
        );
      case "pix_confirmed":
        return (
          <span className="text-xs text-primary font-medium uppercase tracking-wide">
            Pix Confirmado
          </span>
        );
      case "local_pending":
        return (
          <span className="text-xs text-warning font-medium uppercase tracking-wide">
            Pagar no Local
          </span>
        );
      case "mensalista":
        return (
          <span className="text-xs text-amber-500 font-medium uppercase tracking-wide flex items-center gap-1">
            <Crown className="w-3 h-3" /> Mensalista
          </span>
        );
      default:
        return null;
    }
  };

  const isOccupied = status !== "available" && status !== "blocked";

  return (
    <div
      className={cn(
        "p-4 rounded-xl border-2 transition-all",
        getStatusStyles()
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-lg font-bold text-foreground">{time}</span>
          </div>
        </div>

        {status === "available" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onBlock}
            className="text-muted-foreground hover:text-foreground btn-press"
          >
            <Lock className="w-4 h-4 mr-2" />
            Bloquear Horário
          </Button>
        )}

        {status === "blocked" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnblock}
            className="text-muted-foreground hover:text-foreground btn-press"
          >
            <X className="w-4 h-4 mr-2" />
            Desbloquear
          </Button>
        )}

        {isOccupied && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="btn-press">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onViewDetails}>
                Ver Detalhes
              </DropdownMenuItem>
              {status === "local_pending" && (
                <DropdownMenuItem onClick={onMarkAsPaid}>
                  Marcar como Pago
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onCancel}
                className="text-destructive focus:text-destructive"
              >
                Cancelar Reserva
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {(customerName || getStatusLabel()) && (
        <div className="mt-2 flex items-center justify-between">
          <div>
            {customerName && (
              <p className={cn(
                "font-medium",
                status === "mensalista" ? "text-amber-500" : 
                status === "pix_confirmed" ? "text-primary" : "text-foreground"
              )}>
                Time do {customerName}
                {status === "mensalista" && " (Fixo)"}
              </p>
            )}
            {customerPhone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />
                {customerPhone}
              </p>
            )}
          </div>
          {getStatusLabel()}
        </div>
      )}
    </div>
  );
}
