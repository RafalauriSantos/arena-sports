import { useRef } from "react";
import { Calendar } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface DateStripProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateStrip({ selectedDate, onDateChange }: DateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  
  // Generate next 14 days
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const getDayLabel = (date: Date, index: number) => {
    if (index === 0) return "HOJE";
    if (index === 1) return "AMANHÃ";
    return format(date, "EEE", { locale: ptBR }).toUpperCase().slice(0, 3);
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Scrollable Date Strip */}
      <div 
        ref={scrollRef}
        className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all btn-press min-w-[60px]",
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {getDayLabel(date, index)}
              </span>
              <span className="text-lg font-bold">
                {format(date, "dd")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Calendar Picker Button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0 h-14 w-14 border-border bg-secondary hover:bg-secondary/80"
          >
            <Calendar className="w-5 h-5 text-primary" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            disabled={(date) => date < today}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
