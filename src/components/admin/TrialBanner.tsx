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
		<div className="w-full flex justify-center py-2 px-4">
			<div
				onClick={handleBannerClick}
				className={cn(
					"inline-flex items-center gap-2 px-4 py-1.5 rounded-full cursor-pointer transition-all duration-300 hover:scale-[1.02]",
					isLastHours ?
						"bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/40 animate-pulse"
					: isCritical ?
						"bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30"
					: isUrgent ?
						"bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30"
					:	"bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30",
				)}>
				{isLastHours ?
					<AlertCircle className="h-3.5 w-3.5 text-red-400 animate-pulse" />
				: isCritical ?
					<AlertCircle className="h-3.5 w-3.5 text-red-400" />
				: isUrgent ?
					<Clock className="h-3.5 w-3.5 text-orange-400" />
				:	<Sparkles className="h-3.5 w-3.5 text-amber-400" />}

				<span className="text-xs font-medium">
					{isLastHours ?
						<span className="text-red-300">
							🚨 Últimas {trial.hoursRemaining}h de trial
						</span>
					: isCritical ?
						<span className="text-red-300">⚠️ Último dia de trial</span>
					: isUrgent ?
						<span className="text-orange-300">
							⏰ {trial.daysRemaining} dias restantes
						</span>
					:	<span className="text-amber-300">
							💎 Trial: {trial.daysRemaining} dias restantes
						</span>
					}
				</span>

				{canDismiss && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							setDismissed(true);
						}}
						className="ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors">
						<X className="h-3 w-3 text-gray-300 hover:text-white" />
					</button>
				)}
			</div>
		</div>
	);
}
