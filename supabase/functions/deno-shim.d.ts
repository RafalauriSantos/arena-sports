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

declare module "stripe" {
    export type StripeConfig = Record<string, unknown>;

    declare class Stripe {
        constructor(secretKey: string, config?: StripeConfig);

        customers: {
            create(args: Record<string, unknown>): Promise<{ id: string }>;
        };

        checkout: {
            sessions: {
                create(args: Record<string, unknown>): Promise<{ url: string | null }>;
            };
        };

        webhooks: {
            constructEvent(payload: string, signature: string, secret: string): Stripe.Event;
        };
    }

    declare namespace Stripe {
        export type Event = any;
        export type Subscription = any;
    }

    export default Stripe;
}
