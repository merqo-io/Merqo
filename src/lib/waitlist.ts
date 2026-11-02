import { createServiceClient } from "@/lib/supabase/server";
import { UPDATES_OPT_IN_WORDING } from "@/lib/waitlist-consent";

/**
 * Add an email to a kit's waitlist. Called by both the public landing
 * waitlist form (unauthenticated — email typed into the form) and the
 * signed-in dashboard's "Join waitlist" button (email comes from the
 * session, see src/app/actions/join-waitlist.ts).
 *
 * `updatesOptIn` records the separate general-updates consent. It is only
 * written when true and never cleared, so an unticked resubmission cannot
 * erase an earlier opt-in.
 */
export async function addToWaitlist(
  email: string,
  productSlug: string,
  updatesOptIn = false,
): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("vendor_links").upsert(
    {
      email: email.toLowerCase(),
      product_slug: productSlug,
      status: "waitlist",
    },
    { onConflict: "email,product_slug", ignoreDuplicates: true },
  );
  if (error) throw new Error(`waitlist upsert: ${error.message}`);
  if (!updatesOptIn) return;
  const { error: consentError } = await supabase
    .from("marketing_consents")
    .upsert(
      { email: email.toLowerCase(), wording: UPDATES_OPT_IN_WORDING },
      { onConflict: "email", ignoreDuplicates: true },
    );
  if (consentError) {
    throw new Error(`marketing consent upsert: ${consentError.message}`);
  }
}
