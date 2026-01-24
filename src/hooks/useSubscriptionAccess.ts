import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

export type TenantSubscription = {
    tenant_id?: string;
    plan_code?: string;
    plan_name?: string;
    monthly_price?: number;
    billing_interval?: "month" | "year" | null;
    status: SubscriptionStatus;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
    grace_ends_at?: string | null;
    is_founder?: boolean;
};

const DEFAULT_SUB: TenantSubscription = {
    plan_code: "start",
    plan_name: "Trial do Plano Pro (7 dias) — tudo liberado",
    monthly_price: 0,
    billing_interval: null,
    status: "trial",
    trial_started_at: null,
    trial_ends_at: null,
    grace_ends_at: null,
};

function isAfterNow(iso: string | null | undefined) {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getTime() > Date.now();
}

function addDays(iso: string, days: number) {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

function isUuid(value: unknown): value is string {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
        )
    );
}

export function useSubscriptionAccess() {
    const { tenantId } = useAuth();

    const validTenantId = isUuid(tenantId) ? tenantId : null;

    const query = useQuery({
        queryKey: ["tenant-subscription", validTenantId ?? "no-tenant"],
        enabled: Boolean(validTenantId),
        queryFn: async () => {
            // Ensure the tenant has a subscription row + trial dates.
            // This prevents new signups from being blocked if triggers/migrations weren't applied.
            try {
                const ensureKey = validTenantId
                    ? `ensured_tenant_subscription_${validTenantId}`
                    : null;
                const alreadyEnsured =
                    ensureKey && typeof window !== "undefined"
                        ? window.localStorage.getItem(ensureKey) === "1"
                        : false;

                const {
                    data: { session },
                } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (accessToken && validTenantId && !alreadyEnsured) {
                    await invokeEdgeFunction("ensure-tenant-subscription", {
                        accessToken,
                        body: {},
                    });

                    if (ensureKey && typeof window !== "undefined") {
                        window.localStorage.setItem(ensureKey, "1");
                    }
                }
            } catch {
                // Non-fatal: still try to read current subscription state.
            }

            if (!validTenantId) {
                return { subscription: DEFAULT_SUB, isSaasAdmin: false };
            }

            const [subRes, adminRes] = await Promise.all([
                supabase
                    .from("tenant_subscriptions")
                    .select(
                        "plan_code, plan_name, monthly_price, billing_interval, status, trial_started_at, trial_ends_at, grace_ends_at, is_founder"
                    )
                    .eq("tenant_id", validTenantId)
                    .order("updated_at", { ascending: false, nullsFirst: false })
                    .order("created_at", { ascending: false, nullsFirst: false })
                    .limit(1),
                // Optional: if the function doesn't exist yet (migrations not applied), treat as false
                supabase.rpc("fn_is_saas_admin"),
            ]);

            if (subRes.error) throw subRes.error;
            const isSaasAdmin = adminRes.error ? false : Boolean(adminRes.data);

            return {
                subscription:
                    ((subRes.data?.[0] as TenantSubscription | undefined) ??
                        DEFAULT_SUB),
                isSaasAdmin,
            };
        },
        staleTime: 30_000,
    });

    const derived = useMemo(() => {
        const hasError = Boolean(query.error);
        const rawSub = query.data?.subscription ?? DEFAULT_SUB;
        const isSaasAdmin = query.data?.isSaasAdmin ?? false;

        // Defensive (provider-agnostic): normalize plan_code/interval to avoid UI showing
        // the wrong plan if the database row was written inconsistently.
        const normalizedPlanCode = (() => {
            const planCode = (rawSub.plan_code ?? "").toLowerCase();
            if (planCode === "start" || planCode === "pro") return planCode;
            const name = (rawSub.plan_name ?? "").toLowerCase();
            if (name.includes("pro")) return "pro";
            if (name.includes("start")) return "start";
            return "start";
        })();

        const normalizedInterval = (() => {
            const interval = (rawSub.billing_interval ?? null) as unknown;
            return interval === "month" || interval === "year" ? interval : null;
        })();

        const sub: TenantSubscription = {
            ...rawSub,
            plan_code: normalizedPlanCode,
            billing_interval: normalizedInterval,
            plan_name:
                rawSub.plan_name ?? (normalizedPlanCode === "pro" ? "Arena Pro" : "Arena Start"),
            // Preservar is_founder do banco
            is_founder: rawSub.is_founder ?? false,
        };

        const isTrial = sub.status === "trial";
        const isActive = sub.status === "active";
        const isGrace = sub.status === "past_due" && isAfterNow(sub.grace_ends_at);

        const trialStartedAt = sub.trial_started_at ?? null;
        const computedTrialEndsAt =
            sub.trial_ends_at ?? (trialStartedAt ? addDays(trialStartedAt, 7) : null);

        const hasAccess =
            isSaasAdmin ||
            isActive ||
            (isTrial && Boolean(trialStartedAt) && isAfterNow(computedTrialEndsAt)) ||
            isGrace;

        return {
            subscription: { ...sub, trial_ends_at: computedTrialEndsAt },
            isTrial,
            hasAccess,
            isSaasAdmin,
            hasSubscriptionError: hasError,
        };
    }, [query.data, query.error]);

    return {
        ...query,
        ...derived,
    };
}
