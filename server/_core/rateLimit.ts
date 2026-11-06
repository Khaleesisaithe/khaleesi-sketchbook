import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

const windows = new Map<string, number[]>();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export function enforceRateLimit(scope: string, identity: string, maximum: number, windowMs: number): void {
  const now = Date.now();
  const key = `${scope}:${digest(identity.toLowerCase().trim())}`;
  const cutoff = now - windowMs;
  const recent = (windows.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  if (recent.length >= maximum) {
    windows.set(key, recent);
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas tentativas em pouco tempo. Aguarde e tente novamente." });
  }
  recent.push(now);
  windows.set(key, recent);

  if (windows.size > 10_000) {
    for (const [existingKey, values] of windows) {
      const active = values.filter((timestamp) => timestamp > cutoff);
      if (active.length) windows.set(existingKey, active);
      else windows.delete(existingKey);
    }
  }
}
