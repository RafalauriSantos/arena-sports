/**
 * SubscriptionCard - Componente de Assinatura Minimalista
 * Design inspirado em Apple/Stripe/Nubank
 * Focado em clareza, conversão e segurança visual
 */

import {
	CreditCard,
	Calendar,
	CheckCircle2,
	AlertCircle,
	Clock,
	Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TenantSubscription } from "@/hooks/useSubscriptionAccess";

interface SubscriptionCardProps {
	subscription: TenantSubscription;
	billingInterval: "month" | "year";
	onBillingIntervalChange: (interval: "month" | "year") => void;
	onStartCheckout: () => void;
	isStartingCheckout?: boolean;
	isFounder?: boolean;
}

const MONTHLY_PRICE_CENTS = 6990;
const FULL_ANNUAL_PRICE_CENTS = 59700;
const FOUNDER_ANNUAL_PRICE_CENTS = 39700;

export function SubscriptionCard({
	subscription,
	billingInterval,
	onBillingIntervalChange,
	onStartCheckout,
	isStartingCheckout = false,
	isFounder = false,
}: SubscriptionCardProps) {
	const isTrial = subscription.status === "trial";
	const isActive = subscription.status === "active";
	const isPastDue = subscription.status === "past_due";
	const isCanceled = subscription.status === "canceled";

	// Calcular dias restantes do trial
	const computeTrialDaysLeft = (): number | null => {
		if (
			!isTrial ||
			!subscription.trial_started_at ||
			!subscription.trial_ends_at
		) {
			return null;
		}
		const endsAt = new Date(subscription.trial_ends_at);
		const now = new Date();
		const diffTime = endsAt.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return Math.max(0, diffDays);
	};

	const trialDaysLeft = computeTrialDaysLeft();
	const trialTotalDays = 7; // Sempre 7 dias

	// Calcular progresso do trial (0-100)
	const trialProgress = (() => {
		if (
			!isTrial ||
			!subscription.trial_started_at ||
			!subscription.trial_ends_at
		) {
			return 0;
		}
		const started = new Date(subscription.trial_started_at);
		const ends = new Date(subscription.trial_ends_at);
		const now = new Date();
		const total = ends.getTime() - started.getTime();
		const elapsed = now.getTime() - started.getTime();
		return Math.min(100, Math.max(0, (elapsed / total) * 100));
	})();

	// Formatar preço
	const formatPrice = (cents: number | undefined): string => {
		if (!cents) return "R$ 0,00";
		const reais = cents / 100;
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(reais);
	};

	const annualFounderOfferAvailable = isFounder || isTrial || isCanceled;
	const annualPrice =
		annualFounderOfferAvailable ? FOUNDER_ANNUAL_PRICE_CENTS
		:	FULL_ANNUAL_PRICE_CENTS;
	const selectedPrice =
		billingInterval === "month" ? MONTHLY_PRICE_CENTS : annualPrice;
	const priceLabel = billingInterval === "month" ? "/mês" : "/ano";

	// Status badge config
	const getStatusConfig = () => {
		if (isActive) {
			return {
				label: "Ativo",
				color: "bg-emerald-50 text-emerald-700 border-emerald-200",
				icon: CheckCircle2,
				iconColor: "text-emerald-600",
			};
		}
		if (isTrial) {
			return {
				label: "Em Período de Teste",
				color: "bg-amber-50 text-amber-700 border-amber-200",
				icon: Clock,
				iconColor: "text-amber-600",
			};
		}
		if (isPastDue) {
			return {
				label: "Pagamento Pendente",
				color: "bg-red-50 text-red-700 border-red-200",
				icon: AlertCircle,
				iconColor: "text-red-600",
			};
		}
		return {
			label: "Cancelado",
			color: "bg-gray-50 text-gray-700 border-gray-200",
			icon: AlertCircle,
			iconColor: "text-gray-400",
		};
	};

	const statusConfig = getStatusConfig();
	const StatusIcon = statusConfig.icon;

	// Próxima fatura
	const getNextBillingDate = (): string | null => {
		if (isTrial && subscription.trial_ends_at) {
			return new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR");
		}
		// Se ativo, calcular próxima cobrança (30 dias após última)
		if (isActive) {
			const now = new Date();
			const nextMonth = new Date(now);
			nextMonth.setMonth(nextMonth.getMonth() + 1);
			return nextMonth.toLocaleDateString("pt-BR");
		}
		return null;
	};

	const nextBillingDate = getNextBillingDate();

	return (
		<div className="space-y-6">
			{/* Bloco 1: Plano Atual */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
				{/* Header */}
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<h3 className="text-2xl font-semibold text-gray-900">
								{subscription.plan_name || "ArenaSys"}
							</h3>
							{isFounder && (
								<span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">
									Founder
								</span>
							)}
						</div>
						<p className="text-sm text-gray-300">Plano atual</p>
					</div>
					<div
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium",
							statusConfig.color,
						)}>
						<StatusIcon className={cn("h-3.5 w-3.5", statusConfig.iconColor)} />
						{statusConfig.label}
					</div>
				</div>

				{/* Preço */}
				<div className="space-y-2">
					{billingInterval === "year" && annualFounderOfferAvailable ?
						<div className="space-y-1">
							<div className="flex items-baseline gap-2">
								<span className="text-4xl font-bold text-gray-900">
									{formatPrice(selectedPrice)}
								</span>
								<span className="text-lg text-gray-300">{priceLabel}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-lg text-gray-300 line-through">
									{formatPrice(FULL_ANNUAL_PRICE_CENTS)}
								</span>
								<span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">
									Founder 20
								</span>
							</div>
							<p className="text-sm text-amber-600 font-medium flex items-center gap-1">
								✨ Oferta anual limitada para os primeiros clientes
							</p>
						</div>
					:	<div className="flex items-baseline gap-2">
							<span className="text-4xl font-bold text-gray-900">
								{formatPrice(selectedPrice)}
							</span>
							<span className="text-lg text-gray-300">{priceLabel}</span>
						</div>
					}
					{billingInterval === "year" && (
						<p className="text-sm text-gray-300">
							Equivale a {formatPrice(Math.round(selectedPrice / 12))}/mês
						</p>
					)}
				</div>

				{/* Barra de Trial */}
				{isTrial && trialDaysLeft !== null && (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-400 font-medium">
								Restam {trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""} de{" "}
								{trialTotalDays}
							</span>
							<span className="text-gray-300">
								{Math.round(trialProgress)}% usado
							</span>
						</div>
						<Progress
							value={trialProgress}
							className={cn(
								"h-2",
								trialDaysLeft <= 2 ? "bg-red-100 [&>div]:bg-red-500"
								: trialDaysLeft <= 4 ? "bg-amber-100 [&>div]:bg-amber-500"
								: "bg-emerald-100 [&>div]:bg-emerald-500",
							)}
						/>
						{trialDaysLeft <= 2 && (
							<p className="text-xs text-red-600 font-medium flex items-center gap-1">
								<AlertCircle className="h-3 w-3" />
								Trial expira em breve. Assine agora para continuar usando.
							</p>
						)}
					</div>
				)}

				{/* Botão de Ação */}
				{isTrial ?
					<Button
						onClick={onStartCheckout}
						disabled={isStartingCheckout}
						className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 font-semibold text-base shadow-sm">
						{isStartingCheckout ?
							<>
								<Clock className="mr-2 h-4 w-4 animate-spin" />
								Redirecionando...
							</>
						:	<>
								<Sparkles className="mr-2 h-4 w-4" />
								Assinar Agora e Garantir Preço
							</>
						}
					</Button>
				: isActive ?
					<Button
						variant="outline"
						className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
						<CreditCard className="mr-2 h-4 w-4" />
						Gerenciar Assinatura
					</Button>
				:	<Button
						onClick={onStartCheckout}
						disabled={isStartingCheckout}
						className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 font-semibold text-base shadow-sm">
						{isStartingCheckout ?
							<>
								<Clock className="mr-2 h-4 w-4 animate-spin" />
								Redirecionando...
							</>
						:	"Reativar Assinatura"}
					</Button>
				}

				{/* Seletor de Intervalo (apenas se trial ou canceled) */}
				{(isTrial || isCanceled) && (
					<div className="pt-4 border-t border-gray-200">
						<p className="text-sm font-medium text-gray-700 mb-3">
							Escolha o período:
						</p>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => onBillingIntervalChange("month")}
								className={cn(
									"px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all relative",
									billingInterval === "month" ?
										"border-gray-900 bg-gray-900 text-white"
									:	"border-gray-200 bg-white text-gray-700 hover:border-gray-300",
								)}>
								Mensal
								<div className="text-xs mt-0.5 opacity-75">
									{formatPrice(MONTHLY_PRICE_CENTS)}/mês
								</div>
								<span className="block text-[10px] mt-1 opacity-70">
									sem fidelidade
								</span>
							</button>
							<button
								type="button"
								onClick={() => onBillingIntervalChange("year")}
								className={cn(
									"px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all relative",
									billingInterval === "year" ?
										"border-gray-900 bg-gray-900 text-white"
									:	"border-gray-200 bg-white text-gray-700 hover:border-gray-300",
								)}>
								Anual
								<div className="text-xs mt-0.5 opacity-75">
									{formatPrice(annualPrice)}/ano
								</div>
								{annualFounderOfferAvailable && (
									<span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
										Founder
									</span>
								)}
							</button>
						</div>
						<p className="text-xs text-gray-300 mt-3 text-center">
							Mensal sem fidelidade. No anual, escolha Pix, boleto ou cartão no Asaas.
						</p>
					</div>
				)}
			</div>

			{/* Bloco 2: Informações de Cobrança */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
				<h4 className="text-lg font-semibold text-gray-900">
					Informações de Cobrança
				</h4>

				{/* Próxima Fatura */}
				{nextBillingDate && (
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-white rounded-lg shadow-sm">
								<Calendar className="h-4 w-4 text-gray-400" />
							</div>
							<div>
								<p className="text-sm text-gray-300">Próxima fatura</p>
								<p className="text-base font-semibold text-gray-900">
									{isTrial ? "Inicia em" : "Renova em"} {nextBillingDate}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Método de Pagamento */}
				<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-white rounded-lg shadow-sm">
							<CreditCard className="h-4 w-4 text-gray-400" />
						</div>
						<div>
							<p className="text-sm text-gray-300">Método de pagamento</p>
							<p className="text-base font-semibold text-gray-900">Via Asaas</p>
						</div>
					</div>
				</div>

				{/* Histórico Recente */}
				<div className="space-y-3">
					<p className="text-sm font-medium text-gray-700">Histórico Recente</p>
					{isTrial ?
						<div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
							<p className="text-sm text-amber-800">
								✨ Sua primeira fatura será gerada ao fim do período de teste.
							</p>
						</div>
					:	<div className="space-y-2">
							{/* Placeholder para faturas futuras */}
							<div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
								<p className="text-sm text-gray-300 text-center">
									Nenhuma fatura registrada ainda
								</p>
							</div>
						</div>
					}
				</div>

				{/* Segurança */}
				<div className="pt-4 border-t border-gray-200">
					<p className="text-xs text-gray-300 text-center">
						🔒 Pagamento seguro processado pelo Asaas. Você pode cancelar a
						qualquer momento.
					</p>
				</div>
			</div>
		</div>
	);
}
