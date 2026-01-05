type BillingInterval = "month" | "year";

type StripePrice = {
    id: string;
    amount: number;
    label: string;
};

type StripePlan = {
    name: string;
    price: Record<BillingInterval, StripePrice>;
    features: string[];
};

function requiredEnv(name: string): string {
    const value = (import.meta.env as Record<string, string | undefined>)[name];
    if (!value) {
        throw new Error(`Missing env: ${name}`);
    }
    return value;
}

export const stripeConfig: { plans: Record<"start" | "pro", StripePlan> } = {
    plans: {
        start: {
            name: "Arena Start",
            price: {
                month: {
                    id: requiredEnv("VITE_STRIPE_PRICE_START_MONTHLY"),
                    amount: 149,
                    label: "R$ 149/mês",
                },
                year: {
                    id: requiredEnv("VITE_STRIPE_PRICE_START_YEARLY"),
                    amount: 1788,
                    label: "R$ 1.788/ano",
                },
            },
            features: [
                "Agenda Digital Ilimitada",
                "Link de Reservas Online",
                "Cadastro de Clientes",
                "Suporte por Email",
            ],
        },
        pro: {
            name: "Arena Pro",
            price: {
                month: {
                    id: requiredEnv("VITE_STRIPE_PRICE_PRO_MONTHLY"),
                    amount: 249,
                    label: "R$ 249/mês",
                },
                year: {
                    id: requiredEnv("VITE_STRIPE_PRICE_PRO_YEARLY"),
                    amount: 1164,
                    label: "R$ 1.164/ano",
                },
            },
            features: [
                "Tudo do Plano Start",
                "Painel Financeiro Completo",
                "Múltiplos Usuários (Staff)",
                "Relatórios de Ocupação",
                "Suporte Prioritário WhatsApp",
            ],
        },
    },
};

export function getStripePriceId(
    planCode: "start" | "pro",
    interval: BillingInterval
): string {
    return stripeConfig.plans[planCode].price[interval].id;
}
