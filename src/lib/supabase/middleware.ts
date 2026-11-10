import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@merqo/ui/supabase/middleware";

// All operator areas require a session. Everything else (landing, /login,
// /no-access) is public. Merqo-team membership is additionally enforced in each
// /admin page via requireMerqoTeam(); /dashboard needs only a session
// (requireVendorSession). The proxy only guarantees a session.
const PROTECTED_PREFIXES = ["/admin", "/dashboard"] as const;

// refreshPublicRoutes keeps a returning visitor's token rotating on the
// landing and /login, which would otherwise age out and log them out silently.
export function updateSession(request: NextRequest) {
  return updateSupabaseSession(request, {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    cookieDomain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
    protectedPrefixes: PROTECTED_PREFIXES,
    refreshPublicRoutes: true,
  });
}
