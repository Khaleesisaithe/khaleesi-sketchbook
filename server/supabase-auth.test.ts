import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    accessToken: null,
    supabaseUser: null,
    isAdmin: false,
  };
}

describe("Supabase Bearer authentication", () => {
  it("returns an anonymous identity when there is no access token", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.auth.me()).resolves.toEqual({ user: null, isAdmin: false });
  });

  it("denies administrative data access without an authenticated admin", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.appointments.adminList()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
