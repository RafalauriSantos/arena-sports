import { AlertTriangle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTrialStatus } from "@/hooks/useTrialStatus";
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

	if (collapsed) {
		return (
			<div className="mb-2 flex items-center justify-center p-2">
				<div className="relative">
					{isCritical ?
						<AlertTriangle className="h-5 w-5 text-red-400" />
					:	<Clock
							className={cn(
								"h-5 w-5",
								isUrgent ? "text-yellow-300" : "text-blue-300",
							)}
						/>
					}
					<span
						className={cn(
							"absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
							isCritical ? "bg-red-500 text-white"
							: isUrgent ? "bg-[#ffd33d] text-slate-950"
							: "bg-[#0b71ee] text-white",
						)}>
						{trial.daysRemaining}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"mb-3 rounded-lg border px-3 py-3",
				isCritical ? "border-red-400/30 bg-red-500/10"
				: isUrgent ? "border-yellow-300/30 bg-yellow-400/10"
				: "border-blue-400/25 bg-blue-500/10",
			)}>
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					{isCritical ?
						<AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
					:	<Clock
							className={cn(
								"h-4 w-4 shrink-0",
								isUrgent ? "text-yellow-300" : "text-blue-300",
							)}
						/>
					}
					<span className="truncate text-xs font-semibold text-slate-200">
						{isCritical ? "Último dia" : "Trial ativo"}
					</span>
				</div>
				<span
					className={cn(
						"text-xs font-bold",
						isCritical ? "text-red-300"
						: isUrgent ? "text-yellow-200"
						: "text-blue-200",
					)}>
					{isCritical ? `${trial.hoursRemaining}h` : `${trial.daysRemaining}d`}
				</span>
			</div>

			<Progress value={trial.progress} className="mb-2 h-1.5 bg-white/10" />

			<div className="flex items-center justify-between text-[11px] text-slate-400">
				<span>7 dias</span>
				<span>{trial.progress}% usado</span>
			</div>

			{isUrgent && (
				<p
					className={cn(
						"mt-2 text-xs font-semibold",
						isCritical ? "text-red-300" : "text-yellow-200",
					)}>
					{isCritical ? "Assine hoje" : "Tempo acabando"}
				</p>
			)}
		</div>
	);
}
