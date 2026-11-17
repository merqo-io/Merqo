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
  [
    /\brate limit\b|too many requests/i,
    "Too many attempts. Wait a minute and try again.",
  ],
];

export const PASSWORD_REQUIREMENTS_HINT =
  "Use at least 8 characters, with a lowercase letter, an uppercase letter, a number and a symbol.";

export type WeakPasswordReason = "length" | "characters" | "pwned";

const WEAK_PASSWORD_MESSAGE =
  /password should (be at least|contain at least one character)/i;

const CLASS_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/abcdefghijklmnopqrstuvwxyz/, "a lowercase letter"],
  [/ABCDEFGHIJKLMNOPQRSTUVWXYZ/, "an uppercase letter"],
  [/0123456789/, "a number"],
  [/!@#/, "a symbol"],
];

/** Reads Supabase's `reasons` off an auth error without trusting its shape. */
export function errorReasons(error: object): string[] | undefined {
  const reasons = (error as { reasons?: unknown }).reasons;
  return Array.isArray(reasons)
    ? reasons.filter((r): r is string => typeof r === "string")
    : undefined;
}

function joinList(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function lengthSentence(message: string): string {
  const n = /at least (\d+) characters/i.exec(message)?.[1];
  return n
    ? `Password is too short. Use at least ${n} characters.`
    : "Password is too short. Use a longer one.";
}

function charactersSentence(message: string): string {
  const classes = CLASS_PATTERNS.filter(([re]) => re.test(message)).map(
    ([, name]) => name,
  );
  return classes.length
    ? `Password must include ${joinList(classes)}.`
    : "Password needs a wider mix of characters, such as upper and lower case letters, numbers and symbols.";
}

/**
 * Builds specific weak-password copy from Supabase's `reasons` and message,
 * so no policy numbers are hardcoded client-side.
 */
export function weakPasswordMessage({
  reasons,
  message,
}: {
  reasons?: readonly string[];
  message?: string | null;
}): string {
  const text = message ?? "";
  let known = (reasons ?? []).filter((r): r is WeakPasswordReason =>
    ["length", "characters", "pwned"].includes(r),
  );
  if (known.length === 0) {
    if (/at least \d+ characters/i.test(text)) known = ["length"];
    if (/contain at least one character/i.test(text)) {
      known = [...known, "characters"];
    }
  }
  if (known.length === 0) {
    return "That password is too weak. Choose a longer, less common one.";
  }
  return known
    .map((r) => {
      if (r === "length") return lengthSentence(text);
      if (r === "characters") return charactersSentence(text);
      return "This password has appeared in a data breach. Choose a different one.";
    })
    .join(" ");
}

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
  reasons?: readonly string[],
): string {
  if (code === "weak_password" || (raw && WEAK_PASSWORD_MESSAGE.test(raw))) {
    return weakPasswordMessage({ reasons, message: raw });
  }
  if (raw) {
    for (const [pattern, copy] of KNOWN) {
      if (pattern.test(raw)) return copy;
    }
    console.error("auth error (unmapped)", { code: code ?? "unknown" });
  }
  return fallback;
}
