import {
	LayoutDashboard,
	Calendar,
	DollarSign,
	Settings,
	LogOut,
	CalendarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
	activeView: string;
	onViewChange: (view: string) => void;
	onLogout: () => void;
}

const menuItems = [
	{ id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
	{ id: "agenda", label: "Agenda Master", icon: Calendar },
	{ id: "folgas", label: "Folgas", icon: CalendarOff },
	{ id: "financeiro", label: "Financeiro", icon: DollarSign },
	{ id: "configuracoes", label: "Configurações", icon: Settings },
];

export function AdminSidebar({
	activeView,
	onViewChange,
	onLogout,
}: AdminSidebarProps) {
	return (
		<aside className="w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0">
			{/* Logo/Brand */}
			<div className="p-6 border-b border-border">
				<h1 className="text-xl font-black text-gradient-primary">Sport.Ai</h1>
				<p className="text-xs text-muted-foreground mt-1">
					Painel Administrativo
				</p>
			</div>

			{/* Navigation */}
			<nav className="flex-1 p-4 space-y-2">
				{menuItems.map((item) => {
					const Icon = item.icon;
					const isActive = activeView === item.id;

					return (
						<button
							key={item.id}
							onClick={() => onViewChange(item.id)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
								isActive
									? "bg-primary text-primary-foreground shadow-lg glow-primary"
									: "text-muted-foreground hover:bg-secondary hover:text-foreground"
							)}>
							<Icon className="h-5 w-5 flex-shrink-0" />
							<span className="font-medium">{item.label}</span>
						</button>
					);
				})}
			</nav>

			{/* User & Logout */}
			<div className="p-4 border-t border-border space-y-2">
				<div className="px-4 py-2">
					<p className="text-sm font-medium">Admin: João Silva</p>
					<p className="text-xs text-muted-foreground">Dono da Arena</p>
				</div>
				<Button
					variant="outline"
					className="w-full justify-start"
					onClick={onLogout}>
					<LogOut className="h-4 w-4 mr-2" />
					Sair
				</Button>
			</div>
		</aside>
	);
}
