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

type CheckResult = {
    ok: boolean;
    status?: number;
    text?: string;
    error?: string;
};

async function post(url: string, headers: Record<string, string>, body?: unknown): Promise<CheckResult> {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: body == null ? undefined : JSON.stringify(body),
        });

        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

function summarize(name: string, r: CheckResult) {
    const base = `[${name}]`;
    if (r.error) {
        console.log(`${base} ❌ request error: ${r.error}`);
        return;
    }
    const status = r.status ?? 0;
    const text = (r.text ?? "").slice(0, 400);

    // Heurística: queremos distinguir “missing env” vs “auth esperado”.
    const missingAsaasAccess = /Missing ASAAS_ACCESS_TOKEN/i.test(text);
    const missingWebhookToken = /Missing ASAAS_WEBHOOK_TOKEN/i.test(text);

    if (missingAsaasAccess || missingWebhookToken) {
        console.log(`${base} ❌ missing env detected (status=${status})`);
        if (missingAsaasAccess) console.log(`${base}    - ASAAS_ACCESS_TOKEN não está disponível na Edge Function`);
        if (missingWebhookToken) console.log(`${base}    - ASAAS_WEBHOOK_TOKEN não está disponível na Edge Function`);
        return;
    }

    // Casos esperados sem credenciais:
    // - checkout: 401 Unauthorized (porque não mandamos Bearer)
    // - webhook: 401 Unauthorized (porque não mandamos asaas-access-token)
    if (status === 401) {
        console.log(`${base} ✅ env OK (respondeu 401 como esperado sem credenciais)`);
        return;
    }

    // Se 400 por payload inválido no webhook, também indica que passou pela checagem de token.
    if (status === 400 && name.includes("webhook")) {
        console.log(`${base} ✅ env OK (respondeu 400 por payload; token/env provavelmente OK)`);
        return;
    }

    console.log(`${base} ⚠️ resposta inesperada (status=${status})`);
    if (text) console.log(`${base}    body: ${text}`);
}

async function main() {
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

    if (!supabaseUrl || !supabaseAnonKey) {
        console.log(
            "❌ Não achei VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Coloque em .env.local ou env vars."
        );
        process.exit(1);
    }

    const base = supabaseUrl.replace(/\/+$/, "");

    // 1) asaas-create-checkout: sem Bearer deve dar 401, mas NÃO pode reclamar de ASAAS_ACCESS_TOKEN
    const checkoutRes = await post(
        `${base}/functions/v1/asaas-create-checkout`,
        { apikey: supabaseAnonKey },
        { plan_code: "start", interval: "month" }
    );

    // 2) asaas-webhook: sem asaas-access-token deve dar 401, mas NÃO pode reclamar de ASAAS_WEBHOOK_TOKEN
    const webhookRes = await post(
        `${base}/functions/v1/asaas-webhook`,
        { apikey: supabaseAnonKey },
        { id: "test-event", event: "SUBSCRIPTION_UPDATED", subscription: { id: "sub_test" } }
    );

    summarize("asaas-create-checkout", checkoutRes);
    summarize("asaas-webhook", webhookRes);

    console.log("\nSe ambos deram ✅, seus secrets estão acessíveis nas Edge Functions.");
}

main().catch((err) => {
    console.error("❌", err instanceof Error ? err.message : String(err));
    process.exit(1);
});
