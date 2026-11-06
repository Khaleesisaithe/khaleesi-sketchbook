import { createClient } from "@supabase/supabase-js";

const config = typeof window === "undefined" ? undefined : window.__SITE_CONFIG__;

export const supabase = config?.supabaseUrl && config.supabaseAnonKey
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
      },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);

export function getSupabaseOrNull() {
  return supabase;
}
