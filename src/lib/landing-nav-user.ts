import { toNavUser, type NavUser } from "@merqo/ui";
import { createServiceClient } from "@/lib/supabase/server";

type NavAuthUser =
  (NonNullable<Parameters<typeof toNavUser>[0]> & { id: string }) | null;

/**
 * Nav user for the public pages, labelled with the stall name the dashboard
 * shows. merqo.vendor_profile has RLS enabled with no policies (0009), so an
 * authenticated client cannot select it; the service client reads it instead,
 * scoped to the already-verified session user's own id. Read-only on purpose:
 * unlike get_or_create_vendor_profile, a public page never creates a row. Any
 * miss falls back to the display name rather than breaking the page.
 */
export async function getLandingNavUser(
  user: NavAuthUser,
): Promise<NavUser | null> {
  if (!user || !user.id) return toNavUser(user);
  try {
    const service = await createServiceClient();
    const { data, error } = await service
      .from("vendor_profile")
      .select("stall_name")
      .eq("vendor_id", user.id)
      .maybeSingle();
    if (error) return toNavUser(user);
    return toNavUser(user, data?.stall_name);
  } catch {
    return toNavUser(user);
  }
}
