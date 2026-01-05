// Supabase Edge Function: ensure-tenant-subscription
// Ensures the current user's tenant has a tenant_subscriptions row with trial dates.

// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

type Body = {
    start_trial?: boolean;
};

function addDaysIso(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

function addDaysFromIso(iso: string, days: number) {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

function formatUnknownError(err: unknown): string {
    if (err == null) return "Unknown error";
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
            throw new Error("Missing Supabase env (URL/ANON/SERVICE_ROLE)");
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const {
            data: { user },
            error: userError,
        } = await supabaseAuth.auth.getUser();

        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Find tenant_id from profile (avoid maybeSingle/single pitfalls)
        const { data: profiles, error: profileError } = await supabaseAuth
            .from("profiles")
            .select("tenant_id, updated_at, created_at")
            .eq("id", user.id)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1);

        if (profileError) throw profileError;
        const tenantId = profiles?.[0]?.tenant_id ?? null;
        if (!tenantId) {
            return new Response(
                JSON.stringify({
                    error:
                        "Perfil do usuário sem tenant_id. Complete o onboarding (logout/login) e tente novamente.",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Parsing JSON body can fail when the request has no body.
        // Treat as empty object instead of throwing (avoid noisy 500s in the client).
        let resolvedBody: Body = {};
        if (req.method === "POST") {
            try {
                resolvedBody = (await req.json()) as Body;
            } catch {
                resolvedBody = {};
            }
        }

        const startTrial = Boolean((resolvedBody as any)?.start_trial);

        const { data: subs, error: subError } = await supabaseAdmin
            .from("tenant_subscriptions")
            .select(
                "tenant_id, status, plan_code, plan_name, monthly_price, billing_interval, trial_started_at, trial_ends_at, grace_ends_at, created_at, updated_at"
            )
            .eq("tenant_id", tenantId)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1);

        if (subError) throw subError;

        const existing = subs?.[0] ?? null;
        const nowIso = new Date().toISOString();
        const nowTrialEnds = addDaysFromIso(nowIso, 21);
        const nowGraceEnds = addDaysFromIso(nowIso, 24);

        if (!existing) {
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from("tenant_subscriptions")
                .insert({
                    tenant_id: tenantId,
                    plan_code: "start",
                    plan_name: "Arena Start",
                    monthly_price: 149,
                    status: "trial",
                    billing_interval: "month",
                    // Trial starts only after user consent.
                    trial_started_at: null,
                    trial_ends_at: null,
                    grace_ends_at: null,
                })
                .select(
                    "tenant_id, status, plan_code, plan_name, monthly_price, billing_interval, trial_started_at, trial_ends_at, grace_ends_at, created_at, updated_at"
                )
                .limit(1);

            if (insertError) throw insertError;

            return new Response(
                JSON.stringify({
                    tenant_id: tenantId,
                    subscription: inserted?.[0] ?? null,
                    ensured: true,
                    created: true,
                    started: false,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Start trial only after explicit consent.
        const isTrial = existing.status === "trial";
        const hasStarted = Boolean(existing.trial_started_at);
        const needsStart = startTrial && isTrial && !hasStarted;
        const needsDatesAfterStart =
            isTrial && Boolean(existing.trial_started_at) && (!existing.trial_ends_at || !existing.grace_ends_at);

        if (needsStart || needsDatesAfterStart) {
            const patch: Record<string, any> = {};
            if (needsStart) {
                patch.trial_started_at = nowIso;
                patch.trial_ends_at = nowTrialEnds;
                patch.grace_ends_at = nowGraceEnds;
            } else {
                const startedAtIso = existing.trial_started_at ?? nowIso;
                const computedTrialEnds = addDaysFromIso(startedAtIso, 21);
                const computedGraceEnds = addDaysFromIso(startedAtIso, 24);

                patch.trial_ends_at = existing.trial_ends_at ?? computedTrialEnds;
                patch.grace_ends_at = existing.grace_ends_at ?? computedGraceEnds;
            }

            const { data: updated, error: updateError } = await supabaseAdmin
                .from("tenant_subscriptions")
                .update(patch)
                .eq("tenant_id", tenantId)
                .select(
                    "tenant_id, status, plan_code, plan_name, monthly_price, billing_interval, trial_started_at, trial_ends_at, grace_ends_at, created_at, updated_at"
                )
                .limit(1);

            if (updateError) throw updateError;

            return new Response(
                JSON.stringify({
                    tenant_id: tenantId,
                    subscription: updated?.[0] ?? existing,
                    ensured: true,
                    created: false,
                    started: needsStart,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                tenant_id: tenantId,
                subscription: existing,
                ensured: false,
                created: false,
                started: false,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        const message = formatUnknownError(err);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
