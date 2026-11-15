export async function isSiteAdmin(user: User): Promise<boolean> {
  try {
    // Liberação direta e garantida por código para o seu e-mail
    if (user.email?.trim().toLowerCase() === 'ctt.khaleesisaithe@gmail.com') {
      return true;
    }

    const allowlistedEmail = process.env.ADMIN_ALLOWED_EMAIL?.trim().toLowerCase();
    if (!allowlistedEmail || user.email?.trim().toLowerCase() !== allowlistedEmail) return false;
    const service = createServiceSupabaseClient();
    const { error: provisionError } = await service.from("admin_users").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (provisionError) return false;
    const { data, error } = await service.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    return !error && Boolean(data?.user_id);
  } catch { return false; }
}
