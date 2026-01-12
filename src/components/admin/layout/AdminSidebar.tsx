import {
	LayoutDashboard,
	Calendar,
	DollarSign,
	Settings,
	LogOut,
	CalendarOff,
	Share2,
	User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
	const { userProfile } = useAuth();
	return (
		<aside className="w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0">
			{/* Logo/Brand */}
			<div className="p-6 border-b border-border">
				<h1 className="text-xl font-black text-primary tracking-tight drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]">
					ArenaSys
				</h1>
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
									? "bg-primary text-white shadow-[0_0_20px_hsl(var(--primary)/0.4)] font-bold"
									: "text-muted-foreground hover:bg-secondary hover:text-foreground"
							)}>
							<Icon className="h-5 w-5 flex-shrink-0" />
							<span className="font-medium">{item.label}</span>
						</button>
					);
				})}
			</nav>

			{/* Divulgar Arena Button */}
			<div className="px-4 pb-2">
				<Button
					variant="ghost"
					className="w-full justify-start gap-2 text-primary/60 hover:text-primary/80 hover:bg-primary/10 relative overflow-hidden group"
					onClick={() => {
						const link = `https://app.arena.com/minha-arena`;
						navigator.clipboard.writeText(link);
					}}>
					<div className="absolute inset-0 bg-primary/20 animate-pulse group-hover:animate-none" />
					<Share2 className="h-4 w-4 z-10 relative animate-bounce-slow" />
					<span className="z-10 relative font-medium">Divulgar Arena</span>
				</Button>
			</div>

			{/* User & Logout */}
			<div className="p-4 border-t border-border space-y-2">
				<div className="flex items-center gap-3 px-4 py-2">
					<Avatar className="h-10 w-10">
						{userProfile?.avatar_url ? (
							<AvatarImage
								src={userProfile.avatar_url}
								alt={userProfile.full_name ?? "Avatar"}
							/>
						) : (
							<AvatarFallback>
								{(userProfile?.full_name || "A")
									.split(" ")
									.map((n) => n[0])
									.slice(0, 2)
									.join("")}
							</AvatarFallback>
						)}
					</Avatar>
					<div>
						<p className="text-sm font-medium">
							{userProfile?.full_name ?? "Admin"}
						</p>
						<p className="text-xs text-muted-foreground">
							{userProfile?.job_title || "Dono da Arena"}
						</p>
					</div>
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
