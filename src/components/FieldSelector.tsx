import { memo } from "react";
import { Users } from "lucide-react";
import { ARENA_CONFIG, FieldId } from "@/config/arena";
import { cn } from "@/lib/utils";

interface FieldSelectorProps {
	selectedField: FieldId;
	onFieldChange: (field: FieldId) => void;
}

export const FieldSelector = memo(function FieldSelector({
	selectedField,
	onFieldChange,
}: FieldSelectorProps) {
	return (
		<div className="flex gap-1.5 md:gap-2 p-1 bg-card rounded-2xl border border-border">
			{ARENA_CONFIG.fields.map((field) => {
				const isSelected = selectedField === field.id;
				return (
					<button
						key={field.id}
						onClick={() => onFieldChange(field.id)}
						className={cn(
							"flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 px-2 md:px-4 rounded-xl transition-all duration-200 btn-press",
							isSelected
								? "bg-primary text-primary-foreground glow-primary"
								: "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
						)}>
						<span className="font-bold text-sm">{field.name}</span>
						<span
							className={cn(
								"px-2 py-0.5 rounded-full text-xs font-medium",
								isSelected
									? "bg-primary-foreground/20 text-primary-foreground"
									: "bg-muted text-muted-foreground"
							)}>
							{field.players} jog.
						</span>
					</button>
				);
			})}
		</div>
	);
});
