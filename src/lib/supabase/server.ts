import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@merqo/ui/supabase/server";

// Shared project (arch-v2 §2): merqo's tables live in the `merqo` schema,
// qkit's in `public`. Default every .from() to merqo. auth.* is unaffected.
const SCHEMA = "merqo";

export function createServerClient() {
  return createSupabaseServerClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    schema: SCHEMA,
    cookieDomain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
  });
}

// Uses the secret key and bypasses RLS: only for Server Actions and Route
// Handlers. The shared helper attaches no request cookies, so the secret key
// stays the identity for every query.
export async function createServiceClient() {
  return createSupabaseServiceClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    schema: SCHEMA,
  });
}
