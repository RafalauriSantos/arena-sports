import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars missing: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local");
}

export const supabase = createClient(
  supabaseUrl || "https://missing.supabase.co",
  supabaseAnonKey || "MISSING_KEY",
  {
    auth: {
      persistSession: true, // Sempre usa localStorage (pode ser controlado no login)
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage, // Padrão: localStorage (persiste após fechar)
      storageKey: 'sb-auth-token', // Chave customizada
    },
  }
);
