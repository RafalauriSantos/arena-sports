type InvokeOptions = {
    accessToken: string;
    body?: unknown;
};

export class EdgeFunctionHttpError extends Error {
    status: number;
    bodyText?: string;
    constructor(message: string, status: number, bodyText?: string) {
        super(message);
        this.name = "EdgeFunctionHttpError";
        this.status = status;
        this.bodyText = bodyText;
    }
}

export async function invokeEdgeFunction<TResponse>(
    functionName: string,
    options: InvokeOptions
): Promise<TResponse> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
        | string
        | undefined;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Supabase env vars missing: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
        );
    }
    if (!options.accessToken) {
        throw new Error("Sessão inválida. Faça login novamente.");
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: "POST",
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${options.accessToken}`,
            "Content-Type": "application/json",
        },
        body: options.body == null ? undefined : JSON.stringify(options.body),
    });

    // Supabase Edge Functions costumam retornar JSON em erro também.
    // Tenta ler para dar mensagem útil.
    const text = await res.text();
    const maybeJson = (() => {
        try {
            return text ? JSON.parse(text) : null;
        } catch {
            return null;
        }
    })();

    if (!res.ok) {
        const rawMessage =
            (maybeJson && (maybeJson.error || maybeJson.message)) ||
            `Edge Function ${functionName} retornou ${res.status}`;

        const message =
            typeof rawMessage === "string"
                ? rawMessage
                : (() => {
                    try {
                        return JSON.stringify(rawMessage);
                    } catch {
                        return String(rawMessage);
                    }
                })();

        throw new EdgeFunctionHttpError(
            `${res.status} ${message}`,
            res.status,
            text
        );
    }

    return (maybeJson ?? (text as unknown)) as TResponse;
}
