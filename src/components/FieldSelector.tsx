import { Users } from "lucide-react";
import { ARENA_CONFIG, FieldId } from "@/config/arena";
import { cn } from "@/lib/utils";

interface FieldSelectorProps {
  selectedField: FieldId;
  onFieldChange: (field: FieldId) => void;
}

export function FieldSelector({ selectedField, onFieldChange }: FieldSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-1 bg-card rounded-xl">
      {ARENA_CONFIG.fields.map((field) => {
        const isSelected = selectedField === field.id;
        return (
          <button
            key={field.id}
            onClick={() => onFieldChange(field.id)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-lg transition-all duration-200 btn-press",
              isSelected
                ? "bg-primary text-primary-foreground glow-primary"
                : "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Users className={cn("w-5 h-5", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
            <span className="font-semibold text-sm">{field.name}</span>
            <span className={cn(
              "text-xs",
              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {field.players} Jogadores
            </span>
          </button>
        );
      })}
    </div>
  );
}
