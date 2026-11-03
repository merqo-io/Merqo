"use server";

import { kitSlugSchema } from "@/lib/schemas";
import { loadVendorContext, hasActiveLinkFor } from "@/lib/vendor";
import { listLiveProducts } from "@/lib/products";
import { loadVendorSubscriptions } from "@/lib/entitlements/store";
import { createSubscriptionRequest } from "@/lib/subscription-requests";

export type DowngradeActionResult =
  { success: true } | { success: false; error: string };

const GENERIC_ERROR = "Could not send your request. Try again in a moment.";

/** Ask the Merqo team to cancel the subscription that covers `slug`.
 *  Independently re-checks that the vendor actually holds an active link to
 *  that kit — the UI only ever renders this action's button for a kit the
 *  vendor uses, but a direct invocation must not bypass that. */
export async function requestDowngrade(
  slug: string,
): Promise<DowngradeActionResult> {
  if (!kitSlugSchema.safeParse(slug).success) {
    return { success: false, error: GENERIC_ERROR };
  }
  try {
    const { user, links } = await loadVendorContext();
    if (!user?.email) {
      return { success: false, error: "Please sign in first." };
    }
    if (!hasActiveLinkFor(links, slug)) {
      return { success: false, error: GENERIC_ERROR };
    }

    const products = await listLiveProducts();
    if (!products.some((p) => p.slug === slug)) {
      return { success: false, error: GENERIC_ERROR };
    }

    const covering = (await loadVendorSubscriptions(user.id)).find(
      (s) => s.status === "active" && s.includedKits.includes(slug),
    );
    await createSubscriptionRequest({
      vendorId: user.id,
      planSlug: covering?.planSlug ?? "free",
      kind: "cancel",
      note: `Asked from the ${slug} card`,
    });
    return { success: true };
  } catch (err) {
    console.error("requestDowngrade: unexpected failure", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
