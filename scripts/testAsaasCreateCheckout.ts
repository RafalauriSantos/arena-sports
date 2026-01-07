import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

    const email = process.env.TEST_EMAIL || args.email || envLocal.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD || args.password || envLocal.TEST_PASSWORD;

    const planCode = (args.plan || "start").toLowerCase();
    const interval = (args.interval || "month").toLowerCase();

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase env. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local"
        );
    }
    if (!email || !password) {
        throw new Error(
            "Missing credentials. Defina TEST_EMAIL e TEST_PASSWORD em .env.local (ou passe --email/--password)."
        );
    }
    if (planCode !== "start" && planCode !== "pro") {
        throw new Error("plan inválido: use start ou pro");
    }
    if (interval !== "month" && interval !== "year") {
        throw new Error("interval inválido: use month ou year");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (authError) throw authError;
    const accessToken = authData.session?.access_token;
    if (!accessToken) throw new Error("No access token");

    const res = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/functions/v1/asaas-create-checkout`, {
        method: "POST",
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan_code: planCode, interval }),
    });

    const text = await res.text();
    console.log(`status=${res.status}`);
    console.log(text);

    if (!res.ok) {
        console.log(
            "\nSe o erro for de origem, verifique SITE_URL no Supabase e rode isso a partir do domínio do app."
        );
    }
}

main().catch((err) => {
    console.error("❌", err instanceof Error ? err.message : String(err));
    process.exit(1);
});
