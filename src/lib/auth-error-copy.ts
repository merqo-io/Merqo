/** Supabase's duplicate-signup message; callers treat it as a normal signup. */
export const ALREADY_REGISTERED = /already (registered|been registered)/i;

const KNOWN: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid login credentials/i, "Email or password is incorrect."],
  [/email not confirmed/i, "Confirm your email first, then sign in."],
  // Neutral on purpose: naming an existing account would let anyone probe
  // which emails are registered.
  [ALREADY_REGISTERED, "Check your email to continue."],
  [
    /should be different from the old password/i,
    "Choose a password you have not used before.",
  ],
  [/password should be at least/i, "Choose a stronger password."],
  [
    /\brate limit\b|too many requests/i,
    "Too many attempts. Wait a minute and try again.",
  ],
];

/**
 * Turns a Supabase auth error message into plain user-facing copy.
 * Unmapped messages are never returned or logged (they can carry emails);
 * only a fixed tag and the optional error `code` are logged, and the caller
 * gets `fallback`.
 */
export function authErrorCopy(
  raw: string | null | undefined,
  fallback: string,
  code?: string,
): string {
  if (raw) {
    for (const [pattern, copy] of KNOWN) {
      if (pattern.test(raw)) return copy;
    }
    console.error("auth error (unmapped)", { code: code ?? "unknown" });
  }
  return fallback;
}
