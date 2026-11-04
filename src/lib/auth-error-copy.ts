const KNOWN: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid login credentials/i, "Email or password is incorrect."],
  [/email not confirmed/i, "Confirm your email first, then sign in."],
  [
    /already (registered|been registered)/i,
    "That email already has an account. Sign in instead.",
  ],
  [
    /same.*(as|from).*old|different from the old/i,
    "Choose a password you have not used before.",
  ],
  [
    /weak|at least \d+ characters|password should/i,
    "Choose a stronger password.",
  ],
  [
    /rate limit|too many|over_.*_rate_limit/i,
    "Too many attempts. Wait a minute and try again.",
  ],
  // Messages already written for users by our own server actions.
  [/^enter your email/i, "Enter your email and password."],
];

/**
 * Turns a Supabase auth error message into plain user-facing copy.
 * The raw message is logged to the console so it is not lost, and never
 * returned unless it matches a known case; everything else gets `fallback`.
 */
export function authErrorCopy(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (raw) {
    for (const [pattern, copy] of KNOWN) {
      if (pattern.test(raw)) return copy;
    }
    console.error("auth error:", raw);
  }
  return fallback;
}
