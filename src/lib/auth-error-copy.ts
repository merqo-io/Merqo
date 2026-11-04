const KNOWN: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid login credentials/i, "Email or password is incorrect."],
  [/email not confirmed/i, "Confirm your email first, then sign in."],
  // Neutral on purpose: naming an existing account would let anyone probe
  // which emails are registered.
  [/already (registered|been registered)/i, "Check your email to continue."],
  [
    /same.*(as|from).*old|different from the old/i,
    "Choose a password you have not used before.",
  ],
  [/password should be at least/i, "Choose a stronger password."],
  [
    /rate limit|too many requests/i,
    "Too many attempts. Wait a minute and try again.",
  ],
];

const MAX_LOGGED = 200;

function redact(raw: string): string {
  // Token-wise rather than a regex: an email pattern here backtracks badly.
  return raw
    .split(/\s+/)
    .map((word) => (word.includes("@") ? "[email]" : word))
    .join(" ")
    .slice(0, MAX_LOGGED);
}

/**
 * Turns a Supabase auth error message into plain user-facing copy.
 * Unmapped messages are logged truncated with emails redacted, and never
 * returned; everything else gets `fallback`.
 */
export function authErrorCopy(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (raw) {
    for (const [pattern, copy] of KNOWN) {
      if (pattern.test(raw)) return copy;
    }
    console.error("auth error (unmapped):", redact(raw));
  }
  return fallback;
}
