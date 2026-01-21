/**
 * Checklist de Setup na Sidebar
 * Modal compacto que aparece até o usuário completar tudo
 */

import { useState, useEffect, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	CheckCircle2,
	Circle,
	User,
	MapPin,
	Phone,
	CreditCard,
	Trophy,
	Sparkles,
	AlertCircle,
	ChevronRight,
	BadgeDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

// Componente de Confete (animação de celebração)
function Confetti() {
	const [show, setShow] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setShow(false), 4000);
		return () => clearTimeout(timer);
	}, []);

	if (!show) return null;

	return (
		<div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
			{[...Array(80)].map((_, i) => (
				<div
					key={i}
					className="absolute animate-confetti text-2xl"
					style={{
						left: `${Math.random() * 100}%`,
						animationDelay: `${Math.random() * 2}s`,
						animationDuration: `${2 + Math.random() * 2}s`,
					}}>
					{["🎉", "✨", "⭐", "🎊", "💚", "🏆", "🎯"][Math.floor(Math.random() * 7)]}
				</div>
			))}
			<style>{`
				@keyframes confetti {
					0% {
						transform: translateY(-10vh) rotate(0deg);
						opacity: 1;
					}
					100% {
						transform: translateY(110vh) rotate(720deg);
						opacity: 0;
					}
				}
				.animate-confetti {
					animation: confetti linear forwards;
				}
			`}</style>
		</div>
	);
}

interface ChecklistItem {
	id: string;
	label: string;
	description: string;
	icon: typeof Trophy;
	completed: boolean;
	priority: "high" | "medium";
	navTo: string; // Qual aba abrir
}

interface SetupChecklistSidebarProps {
	isOpen: boolean;
	onClose: () => void;
	onNavigate: (view: string) => void;
	tenantId: string;
	userProfile: {
		full_name?: string | null;
		avatar_url?: string | null;
	} | null;
}

export function SetupChecklistSidebar({
	isOpen,
	onClose,
	onNavigate,
	tenantId,
	userProfile,
}: SetupChecklistSidebarProps) {
	const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [showConfetti, setShowConfetti] = useState(false);
	const [wasCompleteRef, setWasCompleteRef] = useState(false);

	// Carrega e valida o checklist
	const loadChecklist = useCallback(async () => {
		if (!tenantId) return;

		try {
			const [courtsRes, tenantData] = await Promise.all([
				supabase
					.from("courts")
					.select("id, base_price")
					.eq("tenant_id", tenantId)
					.eq("active", true),
				supabase
					.from("tenants")
					.select("business_name, phone, address, cpf_cnpj")
					.eq("id", tenantId)
					.single(),
			]);

			const courts = courtsRes.data || [];
			const hasCourts = courts.length > 0;
			const allCourtsPriced = courts.length > 0 && courts.every((c) => c.base_price > 0);

			// Validações do perfil
			const hasProfileName = !!userProfile?.full_name?.trim();
			const hasAvatar = !!userProfile?.avatar_url;

			// Validações do tenant
			const hasBusinessName = !!tenantData.data?.business_name?.trim();
			const hasPhone =
				!!tenantData.data?.phone && tenantData.data.phone.replace(/\D/g, "").length >= 10;
			const hasAddress = !!tenantData.data?.address?.trim();
			const cpfCnpjClean = tenantData.data?.cpf_cnpj?.replace(/\D/g, "") || "";
			const hasCpfCnpj = cpfCnpjClean.length === 11 || cpfCnpjClean.length === 14;

			setChecklist([
				{
					id: "profile",
					label: "Complete seu perfil",
					description: "Nome e foto",
					icon: User,
					completed: hasProfileName && hasAvatar,
					priority: "high",
					navTo: "config",
				},
				{
					id: "business",
					label: "Dados da arena",
					description: "Nome comercial e telefone",
					icon: Phone,
					completed: hasBusinessName && hasPhone,
					priority: "high",
					navTo: "config",
				},
				{
					id: "address",
					label: "Endereço completo",
					description: "Para clientes localizarem",
					icon: MapPin,
					completed: hasAddress,
					priority: "high",
					navTo: "config",
				},
				{
					id: "courts",
					label: "Cadastre suas quadras",
					description: "Pelo menos 1 quadra",
					icon: Trophy,
					completed: hasCourts,
					priority: "high",
					navTo: "config",
				},
			{
				id: "pricing",
				label: "Configure os preços",
				description: "Valores para cada quadra",
				icon: BadgeDollarSign,
				completed: allCourtsPriced,
				priority: "high",
				navTo: "config",
			},
			{
				id: "cpf",
				label: "CPF/CNPJ",
				description: "Para você receber pagamentos",
				icon: CreditCard,
				completed: hasCpfCnpj,
				priority: "medium",
				navTo: "config",
			},
			]);
		} catch (error) {
			console.error("Erro ao carregar checklist:", error);
		} finally {
			setLoading(false);
		}
	}, [tenantId, userProfile, onNavigate]);

	useEffect(() => {
		if (isOpen) {
			setLoading(true);
			loadChecklist();
		}
	}, [isOpen, loadChecklist]);

	const completed = checklist.filter((i) => i.completed).length;
	const total = checklist.length;
	const progress = (completed / total) * 100;
	const isComplete = progress === 100;
	const highPriorityIncomplete = checklist.filter(
		(i) => i.priority === "high" && !i.completed
	);

	// Detecta quando completa 100% e dispara confete
	useEffect(() => {
		if (isComplete && !wasCompleteRef) {
			setShowConfetti(true);
			setWasCompleteRef(true);
			
			// Auto-fecha após celebração
			setTimeout(() => {
				onClose();
			}, 5000);
		}
	}, [isComplete, wasCompleteRef, onClose]);

	const handleItemClick = (item: ChecklistItem) => {
		onNavigate(item.navTo);
		onClose();
	};

	return (
		<>
			{/* Confete de Celebração */}
			{showConfetti && <Confetti />}

			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-md bg-[#0a0c10] border-white/10 text-white">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2 text-xl">
					{isComplete ? (
						<CheckCircle2 className="w-5 h-5 text-green-500" />
					) : (
						<Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
					)}
					<span className={isComplete ? "text-green-400" : "text-emerald-400"}>
						{isComplete ? "Arena Configurada!" : "Configure sua Arena"}
					</span>
				</DialogTitle>
				<DialogDescription className="text-gray-400">
					{isComplete
						? "Tudo pronto para receber reservas! 🎉"
						: `${completed} de ${total} itens concluídos`}
				</DialogDescription>
			</DialogHeader>

				{loading ? (
					<div className="flex items-center justify-center py-8">
						<div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : (
					<div className="space-y-4">
						{/* Progress Bar */}
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-gray-400 font-medium">Progresso</span>
								<span className="font-bold text-white">{Math.round(progress)}%</span>
							</div>
						<Progress
							value={progress}
							className={cn(
								"h-2",
								isComplete ? "bg-green-900/30" : "bg-emerald-900/30"
							)}
						/>
						</div>

						{/* Alerta de Prioridade Alta */}
					{highPriorityIncomplete.length > 0 && (
						<div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
							<AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<p className="text-sm font-semibold text-emerald-200">
									{highPriorityIncomplete.length} item(ns) essencial(is) pendente(s)
								</p>
								<p className="text-xs text-emerald-300 mt-1">
									Complete para compartilhar o link de agendamento.
								</p>
							</div>
						</div>
					)}

						{/* Lista de Items */}
						<div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
							{checklist.map((item) => {
								const Icon = item.icon;
								return (
									<button
										key={item.id}
										onClick={() => handleItemClick(item)}
										disabled={item.completed}
										className={cn(
											"w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left group",
											item.completed
												? "bg-green-500/10 border-green-500/30 cursor-default"
												: "bg-white/5 border-white/10 hover:border-emerald-400 hover:bg-white/10 cursor-pointer"
										)}
									>
										{item.completed ? (
											<CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
										) : (
											<Circle className="w-5 h-5 text-gray-500 flex-shrink-0 group-hover:text-emerald-400" />
										)}

										<Icon
											className={cn(
												"w-4 h-4 flex-shrink-0",
												item.completed
													? "text-green-400"
													: "text-gray-400 group-hover:text-emerald-400"
											)}
										/>

										<div className="flex-1">
											<p
												className={cn(
													"font-medium text-sm",
													item.completed
														? "text-green-200 line-through"
														: "text-white"
												)}
											>
												{item.label}
											</p>
											<p className="text-xs text-gray-500">{item.description}</p>
										</div>

										{!item.completed && (
											<ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-transform" />
										)}
									</button>
								);
							})}
						</div>

						{/* Footer */}
						{isComplete ? (
							<div className="text-center py-4 bg-green-500/10 border border-green-500/30 rounded-lg">
								<div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
									<CheckCircle2 className="w-8 h-8 text-green-400" />
								</div>
								<p className="font-bold text-green-400">Tudo Pronto!</p>
								<p className="text-sm text-gray-400 mt-1">
									Sua arena está 100% configurada.
								</p>
							</div>
						) : (
							<Button
								onClick={() => {
									onNavigate("config");
									onClose();
								}}
								className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
							>
								<Sparkles className="w-4 h-4 mr-2" />
								Ir para Configurações
							</Button>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
		</>
	);
}

/**
 * Hook para calcular progresso do checklist
 * Usado no botão da sidebar
 */
interface UserProfile {
	full_name?: string | null;
	avatar_url?: string | null;
	tenant_id?: string | null;
}

export function useSetupProgress(tenantId: string, userProfile: UserProfile | null | undefined) {
	const [progress, setProgress] = useState({ completed: 0, total: 6 });
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!tenantId) return;

		const loadProgress = async () => {
			try {
				const [courtsRes, tenantData] = await Promise.all([
					supabase
						.from("courts")
						.select("id, base_price")
						.eq("tenant_id", tenantId)
						.eq("active", true),
					supabase
						.from("tenants")
						.select("business_name, phone, address, cpf_cnpj")
						.eq("id", tenantId)
						.single(),
				]);

				const courts = courtsRes.data || [];
				const hasCourts = courts.length > 0;
				const allCourtsPriced = courts.length > 0 && courts.every((c) => c.base_price > 0);

				const hasProfileName = !!userProfile?.full_name?.trim();
				const hasAvatar = !!userProfile?.avatar_url;
				const hasBusinessName = !!tenantData.data?.business_name?.trim();
				const hasPhone =
					!!tenantData.data?.phone &&
					tenantData.data.phone.replace(/\D/g, "").length >= 10;
				const hasAddress = !!tenantData.data?.address?.trim();
				const cpfCnpjClean = tenantData.data?.cpf_cnpj?.replace(/\D/g, "") || "";
				const hasCpfCnpj = cpfCnpjClean.length === 11 || cpfCnpjClean.length === 14;

				const checks = [
					hasProfileName && hasAvatar,
					hasBusinessName && hasPhone,
					hasAddress,
					hasCourts,
					allCourtsPriced,
					hasCpfCnpj,
				];

				const completed = checks.filter(Boolean).length;
				setProgress({ completed, total: 6 });
			} catch (error) {
				console.error("Erro ao calcular progresso:", error);
			} finally {
				setLoading(false);
			}
		};

		loadProgress();

		// Recarrega a cada 5 segundos quando o modal está aberto
		const interval = setInterval(loadProgress, 5000);
		return () => clearInterval(interval);
	}, [tenantId, userProfile]);

	return { ...progress, loading, isComplete: progress.completed === progress.total };
}
