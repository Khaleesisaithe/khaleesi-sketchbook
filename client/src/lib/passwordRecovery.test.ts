import { describe, expect, it } from "vitest";
import {
  isPasswordRecoveryEvent,
  PASSWORD_RECOVERY_PROOF_MAX_AGE_MS,
  passwordRecoveryProofRemainingMs,
} from "./passwordRecovery";

describe("password recovery proof", () => {
  it("accepts only the Supabase recovery event with a session and the recovery callback", () => {
    expect(isPasswordRecoveryEvent("PASSWORD_RECOVERY", true, "1")).toBe(true);
    expect(isPasswordRecoveryEvent("SIGNED_IN", true, "1")).toBe(false);
    expect(isPasswordRecoveryEvent("PASSWORD_RECOVERY", false, "1")).toBe(false);
    expect(isPasswordRecoveryEvent("PASSWORD_RECOVERY", true, null)).toBe(false);
  });

  it("expires after the configured short validity window", () => {
    expect(passwordRecoveryProofRemainingMs(1000, 1001)).toBe(PASSWORD_RECOVERY_PROOF_MAX_AGE_MS - 1);
    expect(passwordRecoveryProofRemainingMs(1000, 1000 + PASSWORD_RECOVERY_PROOF_MAX_AGE_MS)).toBe(0);
    expect(passwordRecoveryProofRemainingMs(null, 1001)).toBe(0);
    expect(passwordRecoveryProofRemainingMs(2000, 1000)).toBe(0);
  });
});
