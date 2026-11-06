import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

function getSupabaseValues() {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, anonKey, serviceKey };
}

export function isSupabaseServerConfigured(): boolean {
  try { getSupabaseValues(); return true; } catch { return false; }
}

export function createAnonSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseValues();
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

export function createUserSupabaseClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabaseValues();
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function createServiceSupabaseClient(): SupabaseClient {
  const { url, serviceKey } = getSupabaseValues();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

export async function verifySupabaseAccessToken(accessToken: string): Promise<User | null> {
  try {
    const { data, error } = await createAnonSupabaseClient().auth.getUser(accessToken);
    if (error || !data.user || !data.user.email_confirmed_at) return null;
    return data.user;
  } catch { return null; }
}

export async function isSiteAdmin(user: User): Promise<boolean> {
  try {
    const allowlistedEmail = process.env.ADMIN_ALLOWED_EMAIL?.trim().toLowerCase();
    if (!allowlistedEmail || user.email?.trim().toLowerCase() !== allowlistedEmail) return false;
    const service = createServiceSupabaseClient();
    const { error: provisionError } = await service.from("admin_users").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (provisionError) return false;
    const { data, error } = await service.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    return !error && Boolean(data?.user_id);
  } catch { return false; }
}

export async function recordEmailDelivery(input: {
  appointmentId: string;
  kind: "owner_new_request" | "customer_decision";
  status: "sent" | "failed" | "not_configured";
  providerMessageId?: string | null;
  errorCode?: string | null;
}): Promise<void> {
  try {
    const service = createServiceSupabaseClient();
    await service.from("email_delivery_logs").insert({
      appointment_id: input.appointmentId,
      kind: input.kind,
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      error_code: input.errorCode ?? null,
    });
  } catch { /* email audit logging must not replace the appointment result */ }
}
