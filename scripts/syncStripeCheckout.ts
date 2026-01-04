import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv: string[]) {
    const args: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a?.startsWith("--")) continue;
        const key = a.slice(2);
        const value = argv[i + 1];
        if (!value || value.startsWith("--")) {
            args[key] = "true";
            continue;
        }
        args[key] = value;
        i++;
    }
    return args;
}

function loadDotEnvLocal(): Record<string, string> {
    const envPath = resolve(process.cwd(), ".env.local");
    if (!existsSync(envPath)) return {};
    const content = readFileSync(envPath, "utf8");
    const out: Record<string, string> = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx <= 0) continue;
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const envLocal = loadDotEnvLocal();

    const supabaseUrl =
        process.env.VITE_SUPABASE_URL ||
        envLocal.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        envLocal.SUPABASE_URL;

    const supabaseAnonKey =
        process.env.VITE_SUPABASE_ANON_KEY ||
        envLocal.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        envLocal.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_KEY ||
        envLocal.SUPABASE_KEY;

    const email = process.env.SYNC_EMAIL || args.email;
    const password = process.env.SYNC_PASSWORD || args.password;
    const sessionId =
        process.env.SYNC_SESSION_ID ||
        args["session-id"] ||
        args.session_id ||
        args.sessionId;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase env. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local"
        );
    }
    if (!email || !password) {
        throw new Error(
            "Missing credentials. Defina SYNC_EMAIL e SYNC_PASSWORD (recomendado via env vars)."
        );
    }
    if (!sessionId || sessionId === "true") {
        throw new Error(
            "Missing session id. Passe --session-id <cs_...> ou defina SYNC_SESSION_ID."
        );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    if (!authData.session?.access_token) {
        throw new Error("No access token returned from signInWithPassword");
    }

    const accessToken = authData.session.access_token;
    const userId = authData.user?.id;

    const res = await fetch(`${supabaseUrl}/functions/v1/stripe-sync-checkout`, {
        method: "POST",
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
    });

    const text = await res.text();
    let json: unknown = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }

    const jsonObj =
        json && typeof json === "object" ? (json as Record<string, unknown>) : null;

    if (!res.ok) {
        const rawError =
            (jsonObj && (jsonObj["error"] ?? jsonObj["message"])) || text || "unknown error";
        const errorMessage =
            typeof rawError === "string" ? rawError : JSON.stringify(rawError);
        throw new Error(
            `stripe-sync-checkout failed (${res.status}): ${errorMessage}`
        );
    }

    console.log("✅ stripe-sync-checkout ok");
    const subscription =
        jsonObj && typeof jsonObj["subscription"] === "object"
            ? (jsonObj["subscription"] as Record<string, unknown>)
            : null;
    if (subscription) {
        const status = String(subscription["status"] ?? "");
        const planName = String(subscription["plan_name"] ?? "");
        const planCode = String(subscription["plan_code"] ?? "");
        console.log(
            `subscription.status=${status} plan=${planName} (${planCode})`
        );
    }

    if (userId) {
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", userId)
            .maybeSingle();
        if (profileError) throw profileError;

        const tenantId = profile?.tenant_id ?? null;
        if (tenantId) {
            const { data: sub, error: subError } = await supabase
                .from("tenant_subscriptions")
                .select("tenant_id, status, plan_code, plan_name, billing_interval, updated_at")
                .eq("tenant_id", tenantId)
                .maybeSingle();
            if (subError) throw subError;
            console.log("📌 tenant_subscriptions:");
            console.log(sub);
        }
    }
}

main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌", message);
    process.exit(1);
});
