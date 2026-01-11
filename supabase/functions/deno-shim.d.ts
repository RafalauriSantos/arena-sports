// Minimal shims so VS Code's TypeScript server can typecheck Supabase Edge Functions
// even when the Deno extension isn't active.

declare namespace Deno {
    const env: {
        get(key: string): string | undefined;
    };

    function serve(
        handler: (req: Request) => Response | Promise<Response>
    ): void;
}

// Declaração de tipo para @supabase/supabase-js
declare module "npm:@supabase/supabase-js@2.89.0" {
    export function createClient(
        supabaseUrl: string,
        supabaseKey: string,
        options?: {
            global?: {
                headers?: Record<string, string>;
            };
        }
    ): {
        auth: {
            getUser(): Promise<{ data: { user: { id: string; email?: string } | null } | null; error: Error | null }>;
            getSession(): Promise<{ data: { session: { access_token: string; user: { id: string; email?: string } } | null } | null }>;
            refreshSession(): Promise<{ data: { session: { access_token: string } } | null; error: Error | null }>;
            signOut(): Promise<void>;
        };
        from(table: string): {
            select(columns: string): any;
            insert(data: any): any;
            update(data: any): any;
            upsert(data: any, options?: { onConflict?: string }): any;
            eq(column: string, value: any): any;
            single(): Promise<{ data: any; error: Error | null }>;
            maybeSingle(): Promise<{ data: any | null; error: Error | null }>;
        };
        rpc(name: string, params?: Record<string, any>): Promise<{ data: any; error: Error | null }>;
    };
}

// Também declarar para o formato esm.sh (caso alguém use)
declare module "https://esm.sh/@supabase/supabase-js@2" {
    export * from "npm:@supabase/supabase-js@2.89.0";
}
