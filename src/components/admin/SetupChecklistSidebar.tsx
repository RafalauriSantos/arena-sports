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
import {
	buildSetupChecklist,
	type SetupChecklistItem,
	type SetupChecklistItemId,
} from "@/lib/setupProgress";

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

const CHECKLIST_ICONS: Record<SetupChecklistItemId, typeof Trophy> = {
	profile: User,
	business: Phone,
	address: MapPin,
	courts: Trophy,
	pricing: BadgeDollarSign,
	cpf: CreditCard,
};

export function SetupChecklistSidebar({
	isOpen,
	onClose,
	onNavigate,
	tenantId,
	userProfile,
}: SetupChecklistSidebarProps) {
	const [checklist, setChecklist] = useState<SetupChecklistItem[]>([]);
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
					.select(
						"business_name, phone, address, cpf_cnpj, cep, street, number, neighborhood, city, state",
					)
					.eq("id", tenantId)
					.single(),
			]);

			setChecklist(
				buildSetupChecklist({
					userProfile,
					tenant: tenantData.data,
					courts: courtsRes.data || [],
				}).items,
			);
		} catch (error) {
			console.error("Erro ao carregar checklist:", error);
		} finally {
			setLoading(false);
		}
	}, [tenantId, userProfile]);

	// Carregar checklist quando o modal abrir
	useEffect(() => {
		if (isOpen && tenantId) {
			setLoading(true);
			loadChecklist();
		}
	}, [isOpen, tenantId, loadChecklist]);

	const completed = checklist.filter((i) => i.completed).length;
	const total = checklist.length;
	const hasChecklist = total > 0;
	const progress = hasChecklist ? (completed / total) * 100 : 0;
	const isComplete = hasChecklist && progress === 100;
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

	const handleItemClick = (item: SetupChecklistItem) => {
		onNavigate(item.navTo);
		onClose();
	};

	return (
		<>
			{/* Confete de Celebração */}
			{showConfetti && <Confetti />}

			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-md border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink)] shadow-[0_24px_80px_rgba(22,50,79,0.16)]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-lg">
							<span className="flex h-8 w-8 items-center justify-center rounded-[var(--az-radius-control)] bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)]">
								{isComplete ?
									<CheckCircle2 className="h-4 w-4" />
								:	<Sparkles className="h-4 w-4" />}
							</span>
							<span>
								{isComplete ? "Arena configurada" : "Configuração da arena"}
							</span>
						</DialogTitle>
						<DialogDescription className="text-[13px] text-[color:var(--az-ink-soft)]">
							{!hasChecklist ?
								"Carregando checklist..."
							: isComplete ?
								"Tudo alinhado para receber reservas."
							:	`${completed} de ${total} itens concluídos`}
						</DialogDescription>
					</DialogHeader>

				{loading || !hasChecklist ? (
					<div className="flex items-center justify-center py-8">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--az-navy-soft)] border-t-[color:var(--az-navy)]" />
					</div>
				) : (
					<div className="space-y-4">
						{/* Progress Bar */}
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="font-medium text-[color:var(--az-ink-soft)]">
									Progresso
								</span>
								<span className="font-semibold text-[color:var(--az-ink)]">
									{Math.round(progress)}%
								</span>
							</div>
						<Progress
							value={progress}
							className="h-2 bg-[color:var(--az-line)] [&>div]:bg-[color:var(--az-navy)]"
						/>
						</div>

						{/* Alerta de Prioridade Alta */}
					{highPriorityIncomplete.length > 0 && (
						<div className="flex items-start gap-3 rounded-[var(--az-radius-control)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-navy-soft)] p-3">
							<AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[color:var(--az-navy)]" />
							<div className="flex-1">
								<p className="text-sm font-semibold text-[color:var(--az-ink)]">
									{highPriorityIncomplete.length} item(ns) essencial(is) pendente(s)
								</p>
								<p className="mt-1 text-xs text-[color:var(--az-ink-soft)]">
									Complete para compartilhar o link de agendamento.
								</p>
							</div>
						</div>
					)}

						{/* Lista de Items */}
						<div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
							{checklist.map((item) => {
								const Icon = CHECKLIST_ICONS[item.id];
								return (
									<button
										key={item.id}
										onClick={() => handleItemClick(item)}
										disabled={item.completed}
										className={cn(
											"group flex w-full items-center gap-3 rounded-[var(--az-radius-control)] border-[0.5px] p-3 text-left transition-all",
											item.completed
												? "cursor-default border-[color:var(--az-line)] bg-[color:var(--az-paper)]"
												: "cursor-pointer border-[color:var(--az-line)] bg-[color:var(--az-surface)] hover:bg-[color:var(--az-paper)]"
										)}
									>
										{item.completed ? (
											<CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[color:var(--az-turf)]" />
										) : (
											<Circle className="h-5 w-5 flex-shrink-0 text-[color:var(--az-ink-soft)] group-hover:text-[color:var(--az-navy)]" />
										)}

										<Icon
											className={cn(
												"h-4 w-4 flex-shrink-0",
												item.completed
													? "text-[color:var(--az-turf)]"
													: "text-[color:var(--az-ink-soft)] group-hover:text-[color:var(--az-navy)]"
											)}
										/>

										<div className="flex-1">
											<p
												className={cn(
													"font-medium text-sm",
													item.completed
														? "text-[color:var(--az-ink)]"
														: "text-[color:var(--az-ink)]"
												)}
											>
												{item.label}
											</p>
											<p className="text-xs text-[color:var(--az-ink-soft)]">
												{item.description}
											</p>
										</div>

										{!item.completed && (
											<ChevronRight className="h-4 w-4 text-[color:var(--az-ink-soft)] transition-transform group-hover:translate-x-1 group-hover:text-[color:var(--az-navy)]" />
										)}
									</button>
								);
							})}
						</div>

						{/* Footer */}
						{isComplete ? (
							<div className="rounded-[var(--az-radius-control)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-paper)] py-4 text-center">
								<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--az-navy-soft)]">
									<CheckCircle2 className="h-7 w-7 text-[color:var(--az-navy)]" />
								</div>
								<p className="font-semibold text-[color:var(--az-ink)]">
									Tudo alinhado
								</p>
								<p className="mt-1 text-sm text-[color:var(--az-ink-soft)]">
									Sua arena está 100% configurada.
								</p>
							</div>
						) : (
							<Button
								onClick={() => {
									onNavigate("config");
									onClose();
								}}
								className="w-full bg-[color:var(--az-navy)] text-white hover:bg-[color:var(--az-navy)]/90"
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

// eslint-disable-next-line react-refresh/only-export-components
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
						.select(
							"business_name, phone, address, cpf_cnpj, cep, street, number, neighborhood, city, state",
						)
						.eq("id", tenantId)
						.single(),
				]);

				const setup = buildSetupChecklist({
					userProfile,
					tenant: tenantData.data,
					courts: courtsRes.data || [],
				});
				setProgress({ completed: setup.completed, total: setup.total });
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
