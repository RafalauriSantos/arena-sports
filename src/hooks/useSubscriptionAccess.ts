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
    status: SubscriptionStatus;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
    grace_ends_at?: string | null;
};

const DEFAULT_SUB: TenantSubscription = {
    plan_code: "start",
    plan_name: "Trial do Plano Pro (21 dias) — tudo liberado",
    monthly_price: 0,
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
                const {
                    data: { session },
                } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (accessToken && validTenantId) {
                    await invokeEdgeFunction("ensure-tenant-subscription", {
                        accessToken,
                        body: {},
                    });
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
                        "plan_code, plan_name, monthly_price, status, trial_started_at, trial_ends_at, grace_ends_at"
                    )
                    .eq("tenant_id", validTenantId)
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
        const sub = query.data?.subscription ?? DEFAULT_SUB;
        const isSaasAdmin = query.data?.isSaasAdmin ?? false;

        const isTrial = sub.status === "trial";
        const isActive = sub.status === "active";
        const isGrace = sub.status === "past_due" && isAfterNow(sub.grace_ends_at);

        const trialStartedAt = sub.trial_started_at ?? null;
        const computedTrialEndsAt =
            sub.trial_ends_at ?? (trialStartedAt ? addDays(trialStartedAt, 21) : null);

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
        };
    }, [query.data]);

    return {
        ...query,
        ...derived,
    };
}
