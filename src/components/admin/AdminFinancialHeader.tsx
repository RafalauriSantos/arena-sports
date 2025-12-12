import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminFinancialHeaderProps {
  todayRevenue: number;
  confirmedGames: number;
  pendingGames: number;
  onSettingsClick: () => void;
}

export function AdminFinancialHeader({
  todayRevenue,
  confirmedGames,
  pendingGames,
  onSettingsClick,
}: AdminFinancialHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Faturamento Hoje</p>
          <p className="text-5xl font-bold text-primary glow-primary-strong tracking-tight">
            R$ {todayRevenue.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="text-primary font-semibold">{confirmedGames} Jogos Confirmados</span>
            {pendingGames > 0 && (
              <span className="text-warning"> | {pendingGames} Pendente{pendingGames > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Settings className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
