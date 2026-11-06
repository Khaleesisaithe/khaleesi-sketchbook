import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "@supabase/supabase-js";
import { isSiteAdmin, verifySupabaseAccessToken } from "./supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  accessToken: string | null;
  supabaseUser: User | null;
  isAdmin: boolean;
};

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const accessToken = bearerToken(opts.req.headers.authorization);
  if (!accessToken) return { req: opts.req, res: opts.res, accessToken: null, supabaseUser: null, isAdmin: false };
  const supabaseUser = await verifySupabaseAccessToken(accessToken);
  const isAdmin = supabaseUser ? await isSiteAdmin(supabaseUser) : false;
  return { req: opts.req, res: opts.res, accessToken, supabaseUser, isAdmin };
}
