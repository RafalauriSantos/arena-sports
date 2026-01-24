/**
 * Contador de Trial na Sidebar
 * Mostra progresso e dias restantes de forma compacta
 */

import { Clock, AlertTriangle, Trophy } from "lucide-react";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TrialCountdownProps {
  tenantId: string;
  collapsed?: boolean;
}

export function TrialCountdown({ tenantId, collapsed }: TrialCountdownProps) {
  const trial = useTrialStatus(tenantId);

  if (!trial?.isActive) return null;

  const isUrgent = trial.daysRemaining <= 2;
  const isCritical = trial.hoursRemaining <= 24;

  // Versão collapsed (apenas ícone + número)
  if (collapsed) {
    return (
      <div className="flex items-center justify-center p-2 mb-2">
        <div className="relative">
          {isCritical ? (
            <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
          ) : (
            <Clock
              className={cn(
                "h-6 w-6",
                isUrgent ? "text-orange-500" : "text-blue-500"
              )}
            />
          )}
          <span
            className={cn(
              "absolute -top-1 -right-1 text-xs font-bold px-1 rounded-full",
              isCritical
                ? "bg-red-500 text-white"
                : isUrgent
                ? "bg-orange-500 text-white"
                : "bg-blue-500 text-white"
            )}
          >
            {trial.daysRemaining}
          </span>
        </div>
      </div>
    );
  }

  // Versão expandida
  return (
    <div
      className={cn(
        "px-3 py-3 mb-3 rounded-xl border transition-all duration-300",
        isCritical
          ? "bg-red-500/10 border-red-500/30"
          : isUrgent
          ? "bg-orange-500/10 border-orange-500/30"
          : "bg-blue-500/10 border-blue-500/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
          ) : isUrgent ? (
            <Clock className="h-4 w-4 text-orange-500" />
          ) : trial.progress >= 80 ? (
            <Trophy className="h-4 w-4 text-blue-500" />
          ) : (
            <Clock className="h-4 w-4 text-blue-500" />
          )}
          <span className="text-xs font-semibold text-gray-300">
            {isCritical ? "Último Dia!" : "Trial Grátis"}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-bold",
            isCritical
              ? "text-red-500"
              : isUrgent
              ? "text-orange-500"
              : "text-blue-500"
          )}
        >
          {isCritical ? `${trial.hoursRemaining}h` : `${trial.daysRemaining}d`}
        </span>
      </div>

      <Progress
        value={trial.progress}
        className={cn(
          "h-2 mb-2",
          isCritical
            ? "bg-red-500/20"
            : isUrgent
            ? "bg-orange-500/20"
            : "bg-blue-500/20"
        )}
      />

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          7 dias
        </span>
        <span className="text-gray-400">{trial.progress}% usado</span>
      </div>

      {isUrgent && (
        <p
          className={cn(
            "text-xs mt-2 font-semibold",
            isCritical ? "text-red-400 animate-pulse" : "text-orange-400"
          )}
        >
          {isCritical
            ? "⚠️ Assine hoje!"
            : "⏰ Tempo acabando!"}
        </p>
      )}
    </div>
  );
}
