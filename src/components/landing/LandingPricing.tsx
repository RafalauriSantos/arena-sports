import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHLY_PRICE_CENTS = 6990;
const FULL_ANNUAL_PRICE_CENTS = 59700;
const FOUNDER_ANNUAL_PRICE_CENTS = 39700;

const planFeatures = [
  "Agenda inteligente e link público de reservas",
  "Pagamento no local ou via WhatsApp",
  "Múltiplas quadras e gestão de mensalistas",
  "Relatórios avançados e suporte prioritário",
  "Bloqueios, folgas e controle por quadra",
  "Painel financeiro com receita prevista",
];

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

interface LandingPricingProps {
  onStartTrial: () => void;
}

export function LandingPricing({ onStartTrial }: LandingPricingProps) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "year",
  );

  const selectedPrice =
    billingInterval === "month"
      ? MONTHLY_PRICE_CENTS
      : FOUNDER_ANNUAL_PRICE_CENTS;
  const priceSuffix = billingInterval === "month" ? "/mês" : "/ano";
  const monthlyEquivalent = Math.round(FOUNDER_ANNUAL_PRICE_CENTS / 12);
  const annualSavingsPercent = Math.round(
    (1 - FOUNDER_ANNUAL_PRICE_CENTS / (MONTHLY_PRICE_CENTS * 12)) * 100,
  );

  return (
    <section
      id="pricing"
      className="relative scroll-mt-24 overflow-hidden px-4 py-28 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[var(--az-navy)]/8 blur-[100px]" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-[var(--az-clay)]/10 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
            Preços transparentes
          </p>
          <h2 className="mx-auto mb-4 max-w-3xl text-3xl font-semibold text-[var(--az-ink)] md:text-5xl">
            Menos que um aluguel de quadra por mês.
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--az-ink-soft)]">
            Teste 7 dias sem cartão. Depois, escolha mensal sem fidelidade ou
            anual Founder com desconto exclusivo para os primeiros clientes.
          </p>
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          {/* Features column */}
          <div className="flex flex-col justify-center rounded-2xl border border-[var(--az-line)] bg-[var(--az-surface)]/80 p-8 shadow-[0_24px_80px_-50px_rgba(22,24,26,0.35)] backdrop-blur-sm">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--az-line)] bg-[var(--az-paper)] px-4 py-2 text-sm font-semibold text-[var(--az-navy)]">
              <Sparkles className="h-4 w-4 text-[var(--az-clay)]" />
              Plano completo ArenaSys
            </div>
            <h3 className="text-2xl font-semibold text-[var(--az-ink)]">
              Tudo que a operação precisa, sem surpresas.
            </h3>
            <p className="mt-3 text-base leading-7 text-[var(--az-ink-soft)]">
              Um único plano com todas as funcionalidades. Sem tiers confusos,
              sem cobranças escondidas.
            </p>

            <ul className="mt-8 space-y-4">
              {planFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--az-navy-soft)]">
                    <Check className="h-3.5 w-3.5 text-[var(--az-navy)]" />
                  </span>
                  <span className="text-sm font-medium leading-6 text-[var(--az-ink)]">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl border border-dashed border-[var(--az-line)] bg-[var(--az-paper)] px-5 py-4">
              <p className="text-sm font-semibold text-[var(--az-ink)]">
                7 dias de teste grátis
              </p>
              <p className="mt-1 text-sm text-[var(--az-ink-soft)]">
                Sem cartão para começar. Você só assina se o fluxo fizer sentido
                na rotina da arena.
              </p>
            </div>
          </div>

          {/* Pricing card */}
          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[var(--az-navy)]/20 via-[var(--az-clay)]/15 to-[var(--az-turf)]/20" />
            <div className="relative flex h-full flex-col rounded-2xl border border-[var(--az-line)] bg-[var(--az-surface)] p-7 shadow-[0_32px_100px_-48px_rgba(22,50,79,0.45)] sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--az-ink-soft)]">
                    Arena System
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-[var(--az-ink)]">
                    Assinatura da arena
                  </h3>
                </div>
                {billingInterval === "year" && (
                  <span className="rounded-full border border-[var(--az-clay)]/30 bg-[var(--az-clay)]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--az-clay)]">
                    Founder
                  </span>
                )}
              </div>

              {/* Billing toggle */}
              <div
                className="mb-8 grid grid-cols-2 gap-2 rounded-xl border border-[var(--az-line)] bg-[var(--az-paper)] p-1.5"
                role="group"
                aria-label="Escolher periodicidade de cobrança"
              >
                <button
                  type="button"
                  onClick={() => setBillingInterval("month")}
                  className={cn(
                    "rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all duration-200",
                    billingInterval === "month"
                      ? "bg-[var(--az-navy)] text-white shadow-sm"
                      : "text-[var(--az-ink)] hover:bg-[var(--az-surface)]",
                  )}
                  aria-pressed={billingInterval === "month"}
                >
                  Mensal
                  <span
                    className={cn(
                      "mt-0.5 block text-xs font-medium",
                      billingInterval === "month"
                        ? "text-white/75"
                        : "text-[var(--az-ink-soft)]",
                    )}
                  >
                    {formatPrice(MONTHLY_PRICE_CENTS)}/mês
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("year")}
                  className={cn(
                    "relative rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all duration-200",
                    billingInterval === "year"
                      ? "bg-[var(--az-navy)] text-white shadow-sm"
                      : "text-[var(--az-ink)] hover:bg-[var(--az-surface)]",
                  )}
                  aria-pressed={billingInterval === "year"}
                >
                  Anual
                  <span
                    className={cn(
                      "mt-0.5 block text-xs font-medium",
                      billingInterval === "year"
                        ? "text-white/75"
                        : "text-[var(--az-ink-soft)]",
                    )}
                  >
                    {formatPrice(FOUNDER_ANNUAL_PRICE_CENTS)}/ano
                  </span>
                  <span className="absolute -right-1 -top-1 rounded-full bg-[var(--az-clay)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    -{annualSavingsPercent}%
                  </span>
                </button>
              </div>

              {/* Price display */}
              <div className="mb-6">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    key={billingInterval}
                    className="text-5xl font-semibold tracking-tight text-[var(--az-ink)] animate-in fade-in slide-in-from-bottom-2 duration-300 sm:text-6xl"
                  >
                    {formatPrice(selectedPrice)}
                  </span>
                  <span className="text-lg text-[var(--az-ink-soft)]">
                    {priceSuffix}
                  </span>
                </div>

                {billingInterval === "year" ? (
                  <div className="mt-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-[var(--az-ink-soft)] line-through">
                        {formatPrice(FULL_ANNUAL_PRICE_CENTS)}/ano
                      </span>
                      <span className="rounded-full bg-[var(--az-clay)]/12 px-2 py-0.5 text-[11px] font-semibold text-[var(--az-clay)]">
                        Founder 20
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--az-turf)]">
                      Equivale a {formatPrice(monthlyEquivalent)}/mês
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-[var(--az-clay)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Oferta anual limitada para os primeiros clientes
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--az-ink-soft)]">
                    Sem fidelidade. Cancele quando quiser.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onStartTrial}
                className="btn-shine relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-[var(--az-navy)] text-base font-semibold text-white shadow-[0_18px_38px_-18px_rgba(22,50,79,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#10283f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/25"
                aria-label="Começar teste grátis de 7 dias"
              >
                <Sparkles className="h-4 w-4" />
                Testar 7 dias grátis
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-3 text-center text-xs text-[var(--az-ink-soft)]">
                Sem cartão para começar · Assine depois do teste
              </p>

              <div className="mt-6 grid gap-3 border-t border-[var(--az-line)] pt-6 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-[var(--az-paper)] p-3">
                  <div className="rounded-lg bg-[var(--az-surface)] p-2 text-[var(--az-navy)]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--az-ink-soft)]">
                      Próxima fatura
                    </p>
                    <p className="text-sm font-semibold text-[var(--az-ink)]">
                      Após o teste de 7 dias
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-[var(--az-paper)] p-3">
                  <div className="rounded-lg bg-[var(--az-surface)] p-2 text-[var(--az-navy)]">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--az-ink-soft)]">
                      Pagamento
                    </p>
                    <p className="text-sm font-semibold text-[var(--az-ink)]">
                      Pix, boleto ou cartão
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] px-3 py-3 text-xs leading-5 text-[var(--az-ink-soft)]">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--az-turf)]" />
                <span>
                  Pagamento seguro processado pelo Asaas. Você pode cancelar a
                  qualquer momento.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
