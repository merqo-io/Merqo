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
