import { Calendar, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
	activeView: "player" | "history";
	onViewChange: (view: "player" | "history") => void;
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
			<div className="container">
				<div className="flex items-center justify-around py-2">
					<button
						onClick={() => onViewChange("player")}
						className={cn(
							"flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all btn-press",
							activeView === "player"
								? "text-primary"
								: "text-muted-foreground hover:text-foreground"
						)}>
						<Calendar className="w-6 h-6" />
						<span className="text-xs font-medium">Agenda</span>
					</button>
					<button
						onClick={() => onViewChange("history")}
						className={cn(
							"flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all btn-press",
							activeView === "history"
								? "text-primary"
								: "text-muted-foreground hover:text-foreground"
						)}>
						<ClipboardList className="w-6 h-6" />
						<span className="text-xs font-medium">Meus Jogos</span>
					</button>
				</div>
			</div>
			{/* Safe area for iOS */}
			<div className="h-safe-area-inset-bottom bg-card" />
		</nav>
	);
}
