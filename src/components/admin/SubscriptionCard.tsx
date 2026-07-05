import {
	CreditCard,
	Calendar,
	CheckCircle2,
	AlertCircle,
	Clock,
	Sparkles,
	ShieldCheck,
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
	const trialTotalDays = 7;

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

	const getStatusConfig = () => {
		if (isActive) {
			return {
				label: "Ativo",
				color:
					"bg-[var(--az-turf-soft)] text-[var(--az-turf)] border-[var(--az-line)]",
				icon: CheckCircle2,
				iconColor: "text-[var(--az-turf)]",
			};
		}
		if (isTrial) {
			return {
				label: "Em teste",
				color:
					"bg-[var(--az-navy-soft)] text-[var(--az-navy)] border-[var(--az-line)]",
				icon: Clock,
				iconColor: "text-[var(--az-navy)]",
			};
		}
		if (isPastDue) {
			return {
				label: "Pagamento pendente",
				color: "bg-rose-50 text-rose-700 border-rose-200",
				icon: AlertCircle,
				iconColor: "text-rose-600",
			};
		}
		return {
			label: "Cancelado",
			color:
				"bg-[var(--az-paper)] text-[var(--az-ink-soft)] border-[var(--az-line)]",
			icon: AlertCircle,
			iconColor: "text-[var(--az-ink-soft)]",
		};
	};

	const statusConfig = getStatusConfig();
	const StatusIcon = statusConfig.icon;

	const getNextBillingDate = (): string | null => {
		if (isTrial && subscription.trial_ends_at) {
			return new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR");
		}
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
		<div className="space-y-5">
			<div className="az-card p-5 sm:p-6 space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<h3 className="text-xl sm:text-2xl font-semibold text-[var(--az-ink)]">
								{subscription.plan_name || "ArenaSys"}
							</h3>
							{isFounder && (
								<span className="rounded-full border border-[var(--az-line)] bg-[var(--az-paper)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--az-clay)]">
									Founder
								</span>
							)}
						</div>
						<p className="text-sm text-[var(--az-ink-soft)]">
							Assinatura e cobrança da arena
						</p>
					</div>
					<div
						className={cn(
							"flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
							statusConfig.color,
						)}>
						<StatusIcon className={cn("h-3.5 w-3.5", statusConfig.iconColor)} />
						{statusConfig.label}
					</div>
				</div>

				<div className="rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] p-4 sm:p-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div className="space-y-2">
							{billingInterval === "year" && annualFounderOfferAvailable ?
								<div className="space-y-1">
									<div className="flex flex-wrap items-baseline gap-2">
										<span className="text-3xl font-semibold text-[var(--az-ink)] sm:text-4xl">
											{formatPrice(selectedPrice)}
										</span>
										<span className="text-base text-[var(--az-ink-soft)]">
											{priceLabel}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-sm text-[var(--az-ink-soft)] line-through">
											{formatPrice(FULL_ANNUAL_PRICE_CENTS)}
										</span>
										<span className="rounded-full border border-[var(--az-line)] bg-[var(--az-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--az-clay)]">
											Founder 20
										</span>
									</div>
									<p className="flex items-center gap-1 text-sm font-medium text-[var(--az-clay)]">
										<Sparkles className="h-3.5 w-3.5" />
										Oferta anual limitada para os primeiros clientes
									</p>
								</div>
							:	<div className="flex flex-wrap items-baseline gap-2">
									<span className="text-3xl font-semibold text-[var(--az-ink)] sm:text-4xl">
										{formatPrice(selectedPrice)}
									</span>
									<span className="text-base text-[var(--az-ink-soft)]">
										{priceLabel}
									</span>
								</div>
							}
							{billingInterval === "year" && (
								<p className="text-sm text-[var(--az-ink-soft)]">
									Equivale a {formatPrice(Math.round(selectedPrice / 12))}/mês
								</p>
							)}
						</div>

						{(isTrial || isCanceled) && (
							<div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
								<button
									type="button"
									onClick={() => onBillingIntervalChange("month")}
									className={cn(
										"rounded-lg border px-3 py-3 text-left text-sm font-medium transition-all",
										billingInterval === "month" ?
											"border-[var(--az-navy)] bg-[var(--az-navy)] text-white"
										:	"border-[var(--az-line)] bg-[var(--az-surface)] text-[var(--az-ink)] hover:border-[var(--az-navy)]",
									)}>
									Mensal
									<span className="block text-xs opacity-75">
										{formatPrice(MONTHLY_PRICE_CENTS)}/mês
									</span>
								</button>
								<button
									type="button"
									onClick={() => onBillingIntervalChange("year")}
									className={cn(
										"relative rounded-lg border px-3 py-3 text-left text-sm font-medium transition-all",
										billingInterval === "year" ?
											"border-[var(--az-navy)] bg-[var(--az-navy)] text-white"
										:	"border-[var(--az-line)] bg-[var(--az-surface)] text-[var(--az-ink)] hover:border-[var(--az-navy)]",
									)}>
									Anual
									<span className="block text-xs opacity-75">
										{formatPrice(annualPrice)}/ano
									</span>
									{annualFounderOfferAvailable && (
										<span className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--az-clay)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
											Founder
										</span>
									)}
								</button>
							</div>
						)}
					</div>
				</div>

				{isTrial && trialDaysLeft !== null && (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium text-[var(--az-ink-soft)]">
								Trial: {trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""} de{" "}
								{trialTotalDays} restantes
							</span>
							<span className="text-[var(--az-ink-soft)]">
								{Math.round(trialProgress)}% usado
							</span>
						</div>
						<Progress
							value={trialProgress}
							className="h-1.5 bg-[var(--az-line)] [&>div]:bg-[var(--az-navy)]"
						/>
						{trialDaysLeft <= 2 && (
							<p className="flex items-center gap-1 text-xs font-medium text-rose-700">
								<AlertCircle className="h-3 w-3" />
								Trial expira em breve. Assine agora para continuar usando.
							</p>
						)}
					</div>
				)}

				{isTrial ?
					<Button
						onClick={onStartCheckout}
						disabled={isStartingCheckout}
						className="h-12 w-full bg-[var(--az-navy)] text-base font-semibold text-white shadow-sm hover:bg-[#10283f]">
						{isStartingCheckout ?
							<>
								<Clock className="mr-2 h-4 w-4 animate-spin" />
								Redirecionando...
							</>
						:	<>
								<Sparkles className="mr-2 h-4 w-4" />
								Assinar agora
							</>
						}
					</Button>
				: isActive ?
					<Button
						variant="outline"
						className="h-12 w-full border-[var(--az-line)] text-[var(--az-ink)] hover:bg-[var(--az-paper)]">
						<CreditCard className="mr-2 h-4 w-4" />
						Gerenciar assinatura
					</Button>
				:	<Button
						onClick={onStartCheckout}
						disabled={isStartingCheckout}
						className="h-12 w-full bg-[var(--az-navy)] text-base font-semibold text-white shadow-sm hover:bg-[#10283f]">
						{isStartingCheckout ?
							<>
								<Clock className="mr-2 h-4 w-4 animate-spin" />
								Redirecionando...
							</>
						:	"Reativar assinatura"}
					</Button>
				}

				<div className="grid gap-3 border-t border-[var(--az-line)] pt-5 sm:grid-cols-2">
					{nextBillingDate && (
						<div className="flex items-center gap-3 rounded-lg bg-[var(--az-paper)] p-3">
							<div className="rounded-lg bg-[var(--az-surface)] p-2 text-[var(--az-navy)]">
								<Calendar className="h-4 w-4" />
							</div>
							<div>
								<p className="text-xs text-[var(--az-ink-soft)]">Próxima fatura</p>
								<p className="text-sm font-semibold text-[var(--az-ink)]">
									{isTrial ? "Inicia em" : "Renova em"} {nextBillingDate}
								</p>
							</div>
						</div>
					)}

					<div className="flex items-center gap-3 rounded-lg bg-[var(--az-paper)] p-3">
						<div className="rounded-lg bg-[var(--az-surface)] p-2 text-[var(--az-navy)]">
							<CreditCard className="h-4 w-4" />
						</div>
						<div>
							<p className="text-xs text-[var(--az-ink-soft)]">Pagamento</p>
							<p className="text-sm font-semibold text-[var(--az-ink)]">
								Pix, boleto ou cartão via Asaas
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-start gap-2 rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] px-3 py-3 text-xs text-[var(--az-ink-soft)]">
					<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--az-turf)]" />
					<span>
						Pagamento seguro processado pelo Asaas. Você pode cancelar a
						qualquer momento.
					</span>
				</div>
			</div>
		</div>
	);
}
