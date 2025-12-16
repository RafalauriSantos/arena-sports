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

	// Generate next 30 days (full month)
	const days = Array.from({ length: 30 }, (_, i) => addDays(today, i));

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
				className="flex-1 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
				{days.map((date, index) => {
					const isSelected = isSameDay(date, selectedDate);
					return (
						<button
							key={date.toISOString()}
							onClick={() => onDateChange(date)}
							className={cn(
								"flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-xl transition-all btn-press min-w-[68px]",
								isSelected
									? "bg-primary text-primary-foreground glow-primary"
									: "bg-card border border-border text-muted-foreground hover:border-primary/50"
							)}>
							<span
								className={cn(
									"text-[10px] font-bold uppercase tracking-wider",
									isSelected
										? "text-primary-foreground"
										: "text-muted-foreground"
								)}>
								{getDayLabel(date, index)}
							</span>
							<span
								className={cn(
									"text-xl font-black number-display",
									isSelected ? "text-primary-foreground" : "text-foreground"
								)}>
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
						className="flex-shrink-0 h-14 w-14 border-border bg-card hover:bg-secondary hover:border-primary/50">
						<Calendar className="w-5 h-5 text-primary" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-auto p-0 bg-card border-border"
					align="end">
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
