import { createClient } from "@supabase/supabase-js";
import { isPasswordRecoveryEvent, passwordRecoveryProofRemainingMs } from "./passwordRecovery";

const config = typeof window === "undefined" ? undefined : window.__SITE_CONFIG__;
let passwordRecoveryProofAt: number | null = null;

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

if (supabase && typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      const recoveryQuery = new URLSearchParams(window.location.search).get("recovery");
      passwordRecoveryProofAt = isPasswordRecoveryEvent(event, Boolean(session), recoveryQuery) ? Date.now() : null;
    } else if (event === "SIGNED_OUT") {
      passwordRecoveryProofAt = null;
    }
  });
}

export const isSupabaseConfigured = Boolean(supabase);

export function hasPasswordRecoveryProof(): boolean {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("recovery") !== "1") {
    passwordRecoveryProofAt = null;
    return false;
  }
  const remaining = passwordRecoveryProofRemainingMs(passwordRecoveryProofAt);
  if (!remaining) passwordRecoveryProofAt = null;
  return remaining > 0;
}

export function getPasswordRecoveryProofRemainingMs(): number {
  const remaining = passwordRecoveryProofRemainingMs(passwordRecoveryProofAt);
  if (!remaining) passwordRecoveryProofAt = null;
  return remaining;
}

export function clearPasswordRecoveryProof(): void {
  passwordRecoveryProofAt = null;
}

export function getSupabaseOrNull() {
  return supabase;
}
