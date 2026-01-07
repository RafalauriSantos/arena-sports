import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

    const webhookToken =
        process.env.TEST_ASAAS_WEBHOOK_TOKEN ||
        args.token ||
        envLocal.TEST_ASAAS_WEBHOOK_TOKEN ||
        "";

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase env. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local"
        );
    }

    const base = supabaseUrl.replace(/\/+$/, "");

    const eventId = `test-${Date.now()}`;
    const payload = {
        id: eventId,
        event: "SUBSCRIPTION_UPDATED",
        subscription: {
            id: "sub_test",
            status: "ACTIVE",
            cycle: "MONTHLY",
            nextDueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
            description: "start",
            externalReference: "00000000-0000-0000-0000-000000000000",
            customer: "cus_test",
        },
        checkout: {
            id: "chk_test",
            description: "start",
            externalReference: "00000000-0000-0000-0000-000000000000",
        },
    };

    const headers: Record<string, string> = {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
    };

    if (webhookToken) {
        headers["asaas-access-token"] = webhookToken;
    }

    const res = await fetch(`${base}/functions/v1/asaas-webhook`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log(`status=${res.status}`);
    console.log(text);

    if (!webhookToken) {
        console.log(
            "\nDica: passe o token para testar de verdade: TEST_ASAAS_WEBHOOK_TOKEN=... bun scripts/testAsaasWebhook.ts"
        );
    }
}

main().catch((err) => {
    console.error("❌", err instanceof Error ? err.message : String(err));
    process.exit(1);
});
