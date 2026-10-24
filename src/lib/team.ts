import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Gate an operator page on Merqo-team membership and a verified second factor. A missing session bounces to
 * /login; a signed-in non-member lands on /no-access (a clear "not on the team
 * yet" screen) rather than a raw 404, so the operator knows what happened.
 */
export async function requireMerqoTeam(): Promise<{ user: User }> {
  const member = await requireTeamMember();
  const supabase = await createServerClient();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2") redirect("/mfa");
  return member;
}

/** Team membership only, for the MFA enrol/verify page itself. */
export async function requireTeamMember(): Promise<{ user: User }> {
  const supabase = await createServerClient();
  let user: User | null = null;
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    user = authError ? null : authUser;
  } catch {
    // Transient auth outage — degrade to signed-out rather than 500.
    redirect("/login");
  }
  if (!user) redirect("/login");
  const { data, error } = await supabase
    .from("merqo_team")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  // A query error (e.g. the `merqo` schema isn't exposed → PGRST106, or the
  // migration/grants are missing) is a config fault, NOT "not a member". Surface
  // it loudly instead of silently bouncing a real member to /no-access.
  if (error) throw new Error(`merqo_team read failed: ${error.message}`);
  if (!data) redirect("/no-access");
  return { user };
}
