import { useState } from "react";
import {
	LayoutDashboard,
	Calendar,
	DollarSign,
	Settings,
	LogOut,
	CalendarOff,
	Share2,
	User,
	Check,
	ChevronLeft,
	ChevronRight,
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
	const [linkCopied, setLinkCopied] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);

	const handleCopyLink = () => {
		const subdomain = "sua-arena"; // TODO: pegar do tenant
		const link = `${window.location.origin}/agendar/${subdomain}`;
		navigator.clipboard.writeText(link);
		setLinkCopied(true);
		setTimeout(() => setLinkCopied(false), 2000);
	};

	return (
		<aside 
			className={cn(
				"bg-gradient-to-b from-gray-950 via-gray-950 to-black border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-500 ease-in-out backdrop-blur-xl",
				isCollapsed ? "w-20" : "w-64"
			)}
		>
			{/* Logo/Brand com animação de glow */}
			<div className="p-6 border-b border-white/5 relative overflow-hidden group">
				{/* Glow effect no hover */}
				<div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
				
				<div className="relative flex items-center justify-between">
					<div className={cn("transition-all duration-500", isCollapsed && "opacity-0 w-0")}>
						<h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-primary/80 tracking-tight drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)] animate-pulse-subtle">
							ArenaSys
						</h1>
						<p className="text-xs text-gray-500 mt-1">
							Painel Administrativo
						</p>
					</div>
					
					{/* Botão de colapsar */}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className={cn(
							"p-2 rounded-lg hover:bg-white/5 transition-all duration-300 hover:scale-110 active:scale-95",
							isCollapsed && "mx-auto"
						)}
						title={isCollapsed ? "Expandir" : "Recolher"}
					>
						{isCollapsed ? (
							<ChevronRight className="w-4 h-4 text-gray-400" />
						) : (
							<ChevronLeft className="w-4 h-4 text-gray-400" />
						)}
					</button>
				</div>
			</div>

			{/* Navigation com animações premium */}
			<nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
				{menuItems.map((item, index) => {
					const Icon = item.icon;
					const isActive = activeView === item.id;

					return (
						<button
							key={item.id}
							onClick={() => onViewChange(item.id)}
							style={{ animationDelay: `${index * 50}ms` }}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group relative overflow-hidden",
								"hover:translate-x-1 hover:scale-[1.02] active:scale-[0.98]",
								"animate-in fade-in slide-in-from-left-5",
								isActive
									? "bg-gradient-to-r from-primary/90 to-primary text-white shadow-[0_0_30px_hsl(var(--primary)/0.5)] font-bold scale-[1.02]"
									: "text-gray-400 hover:bg-white/5 hover:text-white hover:shadow-lg hover:shadow-primary/10"
							)}
						>
							{/* Efeito de brilho animado no hover */}
							{!isActive && (
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
							)}
							
							{/* Indicador lateral para item ativo */}
							{isActive && (
								<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)] animate-in slide-in-from-left-2" />
							)}

							<Icon 
								className={cn(
									"flex-shrink-0 transition-all duration-300",
									isCollapsed ? "w-6 h-6" : "w-5 h-5",
									isActive 
										? "drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
										: "group-hover:scale-110 group-hover:rotate-6"
								)} 
							/>
							
							<span 
								className={cn(
									"font-medium transition-all duration-500",
									isCollapsed ? "opacity-0 w-0" : "opacity-100"
								)}
							>
								{item.label}
							</span>

							{/* Badge de "novo" ou notificação (exemplo) */}
							{item.id === "folgas" && !isCollapsed && (
								<span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold animate-pulse">
									NOVO
								</span>
							)}
						</button>
					);
				})}
			</nav>

			{/* Divulgar Arena Button com animação de sucesso */}
			<div className="px-4 pb-2">
				<button
					onClick={handleCopyLink}
					className={cn(
						"w-full flex items-center gap-2 px-4 py-3 rounded-xl relative overflow-hidden group transition-all duration-300",
						"hover:scale-[1.02] active:scale-95",
						linkCopied
							? "bg-green-500/20 border-2 border-green-500/50 text-green-400"
							: "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-primary hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
					)}
				>
					{/* Efeito de onda ao copiar */}
					{linkCopied && (
						<div className="absolute inset-0 bg-green-500/30 animate-ping" />
					)}
					
					{linkCopied ? (
						<Check className="h-4 w-4 z-10 relative animate-in zoom-in-50" />
					) : (
						<Share2 className="h-4 w-4 z-10 relative group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
					)}
					
					<span className={cn(
						"z-10 relative font-medium transition-all duration-500",
						isCollapsed ? "opacity-0 w-0" : "opacity-100"
					)}>
						{linkCopied ? "Link Copiado!" : "Compartilhar Arena"}
					</span>
				</button>
			</div>

			{/* User & Logout com glassmorphism */}
			<div className="p-4 border-t border-white/5 space-y-2 bg-gradient-to-b from-transparent to-white/[0.02]">
				<div className={cn(
					"flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-300 cursor-pointer group",
					isCollapsed && "justify-center px-2"
				)}>
					<Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-110">
						{userProfile?.avatar_url ? (
							<AvatarImage
								src={userProfile.avatar_url}
								alt={userProfile.full_name ?? "Avatar"}
							/>
						) : (
							<AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-bold">
								{(userProfile?.full_name || "A")
									.split(" ")
									.map((n) => n[0])
									.slice(0, 2)
									.join("")}
							</AvatarFallback>
						)}
					</Avatar>
					<div className={cn(
						"transition-all duration-500",
						isCollapsed ? "opacity-0 w-0" : "opacity-100"
					)}>
						<p className="text-sm font-semibold text-white">
							{userProfile?.full_name ?? "Admin"}
						</p>
						<p className="text-xs text-gray-500">
							{userProfile?.job_title || "Gestor"}
						</p>
					</div>
				</div>
				
				<button
					onClick={onLogout}
					className={cn(
						"w-full flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300",
						"border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40",
						"hover:scale-[1.02] active:scale-95 group",
						isCollapsed && "justify-center px-2"
					)}
				>
					<LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
					<span className={cn(
						"font-medium transition-all duration-500",
						isCollapsed ? "opacity-0 w-0" : "opacity-100"
					)}>
						Sair
					</span>
				</button>
			</div>
		</aside>
	);
}
