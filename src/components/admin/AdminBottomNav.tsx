import { Home, Calendar, Crown, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTab = "today" | "calendar" | "mensalistas" | "support";

interface AdminBottomNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const tabs = [
  { id: "today" as AdminTab, label: "Hoje", icon: Home },
  { id: "calendar" as AdminTab, label: "Calendário", icon: Calendar },
  { id: "mensalistas" as AdminTab, label: "Mensalistas", icon: Crown },
  { id: "support" as AdminTab, label: "Suporte", icon: Headphones },
];

export function AdminBottomNav({ activeTab, onTabChange }: AdminBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="container">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all btn-press",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
}
