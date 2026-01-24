/**
 * Banner de Trial no topo do dashboard
 * Alerta visual que aumenta urgência conforme trial expira
 */

import { AlertCircle, Clock, Sparkles, X } from "lucide-react";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface TrialBannerProps {
  tenantId: string;
}

export function TrialBanner({ tenantId }: TrialBannerProps) {
  const trial = useTrialStatus(tenantId);
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Não mostra se não há trial ativo ou foi dismissado
  if (!trial?.isActive || dismissed) return null;

  const isUrgent = trial.daysRemaining <= 2;
  const isCritical = trial.hoursRemaining <= 24;
  const isLastHours = trial.hoursRemaining <= 3;

  // Permite fechar apenas se não for crítico
  const canDismiss = !isCritical;

  const handleBannerClick = () => {
    navigate("/dashboard?view=config&tab=billing");
  };

  return (
    <div
      onClick={handleBannerClick}
      className={cn(
        "w-full px-4 py-3 flex items-center justify-between gap-4",
        "border-b transition-all duration-300",
        "cursor-pointer hover:opacity-90",
        isLastHours
          ? "bg-red-600/20 border-red-500/50 animate-pulse"
          : isCritical
          ? "bg-red-500/10 border-red-500/30"
          : isUrgent
          ? "bg-orange-500/10 border-orange-500/30"
          : "bg-blue-500/10 border-blue-500/30"
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        {isLastHours ? (
          <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
        ) : isCritical ? (
          <AlertCircle className="h-5 w-5 text-red-500" />
        ) : isUrgent ? (
          <Clock className="h-5 w-5 text-orange-500" />
        ) : (
          <Sparkles className="h-5 w-5 text-blue-500" />
        )}

        <div className="flex-1">
          <p className="font-semibold text-sm">
            {isLastHours ? (
              <>
                🚨 <span className="text-red-500">ÚLTIMAS HORAS!</span> Seu trial expira em{" "}
                <span className="text-red-500 font-bold">{trial.hoursRemaining}h</span>
              </>
            ) : isCritical ? (
              <>
                ⚠️ <span className="text-red-500">ÚLTIMO DIA DE TRIAL!</span> Expira hoje às 23:59
              </>
            ) : isUrgent ? (
              <>
                ⏰ Faltam apenas{" "}
                <span className="text-orange-500 font-bold">
                  {trial.daysRemaining} dia{trial.daysRemaining !== 1 ? "s" : ""}
                </span>{" "}
                de trial
              </>
            ) : (
              <>
                🎉 Você tem{" "}
                <span className="text-blue-500 font-bold">
                  {trial.daysRemaining} dias
                </span>{" "}
                grátis para testar tudo
              </>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isCritical ? (
              "Assine agora e não perca seu progresso! 💳"
            ) : (
              <>
                Trial de 7 dias •{" "}
                Expira em {new Date(trial.trialEndsAt).toLocaleDateString("pt-BR")}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          onClick={handleBannerClick}
          variant={isCritical ? "destructive" : isUrgent ? "default" : "outline"}
          size="sm"
          className={cn(
            "shrink-0 font-semibold",
            isLastHours && "animate-pulse"
          )}
        >
          {isCritical ? "Assinar Agora!" : isUrgent ? "Ver Planos" : "Upgrade"}
        </Button>

        {canDismiss && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            variant="ghost"
            size="sm"
            className="shrink-0 p-1 h-auto text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
