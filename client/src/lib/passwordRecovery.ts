export const PASSWORD_RECOVERY_PROOF_MAX_AGE_MS = 15 * 60 * 1000;

export function isPasswordRecoveryEvent(event: string, hasSession: boolean, recoveryQuery: string | null): boolean {
  return event === "PASSWORD_RECOVERY" && hasSession && recoveryQuery === "1";
}

export function passwordRecoveryProofRemainingMs(proofAt: number | null, now = Date.now()): number {
  if (proofAt === null) return 0;
  const age = now - proofAt;
  if (age < 0 || age >= PASSWORD_RECOVERY_PROOF_MAX_AGE_MS) return 0;
  return PASSWORD_RECOVERY_PROOF_MAX_AGE_MS - age;
}
