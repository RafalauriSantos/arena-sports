import { memo } from "react";
import { ARENA_CONFIG } from "@/config/arena";

export const Header = memo(function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="container px-5 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20 glow-primary">
            <span className="text-2xl">⚽</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {ARENA_CONFIG.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {ARENA_CONFIG.subtitle}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
});
