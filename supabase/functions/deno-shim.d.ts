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

declare module "npm:@supabase/supabase-js@2.89.0" {
    export const createClient: (...args: any[]) => any;
}
