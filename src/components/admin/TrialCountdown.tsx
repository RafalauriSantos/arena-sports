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
						<AlertTriangle className="h-5 w-5 text-red-500" />
					:	<Clock
							className={cn(
								"h-5 w-5",
								isUrgent ? "text-yellow-700" : "text-[#0b71ee]",
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
				isCritical ? "border-red-200 bg-red-50"
				: isUrgent ? "border-yellow-200 bg-yellow-50"
				: "border-blue-100 bg-blue-50",
			)}>
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					{isCritical ?
						<AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
					:	<Clock
							className={cn(
								"h-4 w-4 shrink-0",
								isUrgent ? "text-yellow-700" : "text-[#0b71ee]",
							)}
						/>
					}
					<span className="truncate text-xs font-semibold text-slate-700">
						{isCritical ? "Último dia" : "Trial ativo"}
					</span>
				</div>
				<span
					className={cn(
						"text-xs font-bold",
						isCritical ? "text-red-600"
						: isUrgent ? "text-yellow-800"
						: "text-[#0b71ee]",
					)}>
					{isCritical ? `${trial.hoursRemaining}h` : `${trial.daysRemaining}d`}
				</span>
			</div>

			<Progress value={trial.progress} className="mb-2 h-1.5 bg-white" />

			<div className="flex items-center justify-between text-[11px] text-slate-500">
				<span>7 dias</span>
				<span>{trial.progress}% usado</span>
			</div>

			{isUrgent && (
				<p
					className={cn(
						"mt-2 text-xs font-semibold",
						isCritical ? "text-red-600" : "text-yellow-800",
					)}>
					{isCritical ? "Assine hoje" : "Tempo acabando"}
				</p>
			)}
		</div>
	);
}
