/**
 * Banner de Trial no topo do dashboard
 * Alerta visual que aumenta urgência conforme trial expira
 */

import { AlertCircle, Clock, Sparkles, X } from "lucide-react";
import type { KeyboardEvent } from "react";
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

	const handleBannerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleBannerClick();
		}
	};

	return (
		<div className="w-full flex justify-center py-2 px-4">
			<div
				role="button"
				tabIndex={0}
				onClick={handleBannerClick}
				onKeyDown={handleBannerKeyDown}
				className={cn(
					"inline-flex items-center gap-2 rounded-full px-4 py-1.5 cursor-pointer transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)]",
					isLastHours ?
						"bg-red-50 border border-red-200"
					: isCritical ?
						"bg-red-50 border border-red-200"
					: isUrgent ?
						"bg-yellow-50 border border-yellow-200"
					:	"bg-[color:var(--az-navy-soft)] border border-[color:var(--az-line)]",
				)}>
				{isLastHours ?
					<AlertCircle className="h-3.5 w-3.5 text-red-600" />
				: isCritical ?
					<AlertCircle className="h-3.5 w-3.5 text-red-600" />
				: isUrgent ?
					<Clock className="h-3.5 w-3.5 text-yellow-700" />
				:	<Sparkles className="h-3.5 w-3.5 text-[color:var(--az-navy)]" />}

				<span className="text-xs font-medium">
					{isLastHours ?
						<span className="font-black text-red-700">
							Últimas {trial.hoursRemaining}h de trial
						</span>
					: isCritical ?
						<span className="font-black text-red-700">Último dia de trial</span>
					: isUrgent ?
						<span className="font-black text-yellow-800">
							{trial.daysRemaining} dias restantes
						</span>
					:	<span className="font-black text-[color:var(--az-navy)]">
							Trial: {trial.daysRemaining} dias restantes
						</span>
					}
				</span>

				{canDismiss && (
					<button
						type="button"
						aria-label="Fechar aviso de trial"
						onClick={(e) => {
							e.stopPropagation();
							setDismissed(true);
						}}
						className="ml-1 rounded-full p-0.5 transition-colors hover:bg-[color:var(--az-line)]">
						<X className="h-3 w-3 text-[color:var(--az-ink-soft)] hover:text-[color:var(--az-ink)]" />
					</button>
				)}
			</div>
		</div>
	);
}
