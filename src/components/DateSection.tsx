import { Calendar } from "lucide-react";
import { TimeSlot } from "@/types/booking";
import { TimeSlotCard } from "./TimeSlotCard";

interface DateSectionProps {
  title: string;
  slots: TimeSlot[];
  onSlotClick: (slot: TimeSlot) => void;
}

export function DateSection({ title, slots, onSlotClick }: DateSectionProps) {
  if (slots.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground capitalize">{title}</h3>
      </div>
      <div className="space-y-2">
        {slots.map((slot) => (
          <TimeSlotCard key={slot.id} slot={slot} onClick={onSlotClick} />
        ))}
      </div>
    </div>
  );
}
