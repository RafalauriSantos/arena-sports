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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg">
      <div className="container">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-4 py-2 transition-colors btn-press",
                activeTab === tab.id
                  ? "bg-blue-50 text-[#0b71ee]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
