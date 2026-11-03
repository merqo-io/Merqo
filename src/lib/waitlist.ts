import { createServiceClient } from "@/lib/supabase/server";
import { UPDATES_OPT_IN_WORDING } from "@/lib/waitlist-consent";

/**
 * Add an email to a kit's waitlist. Called by both the public landing
 * waitlist form (unauthenticated — email typed into the form) and the
 * signed-in dashboard's "Join waitlist" button (email comes from the
 * session, see src/app/actions/join-waitlist.ts).
 *
 * `updatesOptIn` records the separate general-updates consent. It is only
 * written when true (ticking again refreshes the record and clears any
 * withdrawal), so an unticked resubmission cannot erase an earlier opt-in.
 */
export async function addToWaitlist(
  email: string,
  productSlug: string,
  updatesOptIn = false,
): Promise<void> {
  const normalized = email.toLowerCase();
  const supabase = await createServiceClient();
  // The kit row goes first so a failed consent write can be retried: the
  // vendor_links upsert is idempotent and the consent upsert overwrites.
  const { error } = await supabase.from("vendor_links").upsert(
    {
      email: normalized,
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
      {
        email: normalized,
        wording: UPDATES_OPT_IN_WORDING,
        consented_at: new Date().toISOString(),
        withdrawn_at: null,
      },
      { onConflict: "email" },
    );
  if (consentError) {
    throw new Error(`marketing consent upsert: ${consentError.message}`);
  }
}
