import { createSupabaseBrowserClient } from "@merqo/ui/supabase";

export function createClient() {
  return createSupabaseBrowserClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    cookieDomain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
  });
}
