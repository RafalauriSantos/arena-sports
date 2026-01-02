import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

export type TenantSubscription = {
    tenant_id?: string;
    plan_code?: string;
    plan_name?: string;
    monthly_price?: number;
    status: SubscriptionStatus;
    trial_ends_at?: string | null;
    grace_ends_at?: string | null;
};

const DEFAULT_SUB: TenantSubscription = {
    plan_code: "start",
    plan_name: "Trial Gratuito",
    monthly_price: 0,
    status: "trial",
    trial_ends_at: null,
    grace_ends_at: null,
};

function isAfterNow(iso: string | null | undefined) {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getTime() > Date.now();
}

export function useSubscriptionAccess() {
    const { tenantId } = useAuth();

    const query = useQuery({
        queryKey: ["tenant-subscription", tenantId],
        enabled: Boolean(tenantId),
        queryFn: async () => {
            const [subRes, adminRes] = await Promise.all([
                supabase
                    .from("tenant_subscriptions")
                    .select(
                        "plan_code, plan_name, monthly_price, status, trial_ends_at, grace_ends_at"
                    )
                    .eq("tenant_id", tenantId)
                    .maybeSingle(),
                // Optional: if the function doesn't exist yet (migrations not applied), treat as false
                supabase.rpc("fn_is_saas_admin"),
            ]);

            if (subRes.error) throw subRes.error;
            const isSaasAdmin = adminRes.error ? false : Boolean(adminRes.data);

            return {
                subscription: (subRes.data as TenantSubscription) ?? DEFAULT_SUB,
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

        const hasAccess =
            isSaasAdmin ||
            isActive ||
            (isTrial && isAfterNow(sub.trial_ends_at)) ||
            isGrace;

        return {
            subscription: sub,
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
