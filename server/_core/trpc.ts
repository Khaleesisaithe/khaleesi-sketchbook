import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });
export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(({ ctx, next }) => {
  if (!ctx.supabaseUser || !ctx.accessToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Entre na sua conta para continuar." });
  }
  return next({ ctx: { ...ctx, supabaseUser: ctx.supabaseUser, accessToken: ctx.accessToken } });
});

const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.supabaseUser || !ctx.accessToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Entre na sua conta para continuar." });
  }
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta conta não tem acesso administrativo." });
  }
  return next({ ctx: { ...ctx, supabaseUser: ctx.supabaseUser, accessToken: ctx.accessToken, isAdmin: true } });
});

export const protectedProcedure = t.procedure.use(requireUser);
export const adminProcedure = t.procedure.use(requireAdmin);
