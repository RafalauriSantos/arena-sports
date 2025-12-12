import { Trophy } from "lucide-react";
import { ARENA_CONFIG } from "@/config/arena";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 glow-primary">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {ARENA_CONFIG.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ARENA_CONFIG.subtitle}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
