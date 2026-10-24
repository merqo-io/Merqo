import type { CspOptions } from "@merqo/ui/security";

// Routes that always render per request, so they can carry a CSP nonce.
export const NONCE_PREFIXES = [
  "/admin",
  "/mfa",
  "/dashboard",
  "/auth",
  "/login",
  "/profile",
  "/reset-password",
  "/no-access",
  "/post-login",
  "/legal/accept",
] as const;

export function needsNonce(pathname: string): boolean {
  return NONCE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Hash of next-themes' minified inline bootstrap in a production build; e2e/csp.spec.ts fails on any CSP violation if a bump changes it.
export const THEME_SCRIPT_HASH =
  "'sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='";

const SUPABASE = ["https://*.supabase.co"];
const LOCAL_SUPABASE = ["http://127.0.0.1:54321"];

export function cspOptions(isDev: boolean): Omit<CspOptions, "nonce"> {
  return {
    isDev,
    connectSrc: [
      ...SUPABASE,
      "wss://*.supabase.co",
      ...(isDev ? [...LOCAL_SUPABASE, "ws://127.0.0.1:54321"] : []),
    ],
    imgSrc: [...SUPABASE, ...(isDev ? LOCAL_SUPABASE : [])],
  };
}

export function nonceCspOptions(isDev: boolean): Omit<CspOptions, "nonce"> {
  return { ...cspOptions(isDev), scriptSrc: [THEME_SCRIPT_HASH] };
}
