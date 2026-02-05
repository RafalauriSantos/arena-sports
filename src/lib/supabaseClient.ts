import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars missing: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local");
}

// Singleton: garante uma única instância do cliente Supabase
// Isso evita o aviso "Multiple GoTrueClient instances detected"
let supabaseInstance: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      supabaseUrl || "https://missing.supabase.co",
      supabaseAnonKey || "MISSING_KEY",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'sb-auth-token',
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
          timeout: 30000, // Aumentado para 30s
        },
        global: {
          headers: {
            'x-client-info': 'arena-sports-web',
          },
        },
      }
    );
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();
