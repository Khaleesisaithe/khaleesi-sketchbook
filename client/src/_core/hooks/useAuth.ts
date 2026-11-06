import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { ARTIST_ROUTE } from "@/lib/privateRoute";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const user = meQuery.data?.user ?? null;

  async function logout() {
    await supabase?.auth.signOut();
    await meQuery.refetch();
  }

  useEffect(() => {
    if (!redirectOnUnauthenticated || meQuery.isLoading || user || typeof window === "undefined") return;
    const target = redirectPath || ARTIST_ROUTE;
    if (window.location.pathname !== target) window.location.assign(target);
  }, [redirectOnUnauthenticated, redirectPath, meQuery.isLoading, user]);

  return {
    user,
    loading: meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(user),
    refresh: () => meQuery.refetch(),
    logout,
  };
}
