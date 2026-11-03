"use server";

import { kitSlugSchema } from "@/lib/schemas";
import { loadVendorContext, hasActiveLinkFor } from "@/lib/vendor";
import { listLiveProducts } from "@/lib/products";
import { loadPlanCatalog } from "@/lib/pricing/catalog";
import {
  createSubscriptionRequest,
  upgradePlanForKit,
} from "@/lib/subscription-requests";

export type UpgradeActionResult =
  { success: true } | { success: false; error: string };

const GENERIC_ERROR = "Could not send your request. Try again in a moment.";

/** Ask the Merqo team to upgrade the signed-in vendor for `slug`. Independently
 *  re-checks that the vendor actually holds an active link to that kit — the
 *  UI only ever renders this action's button for a kit the vendor uses, but a
 *  direct invocation must not bypass that. */
export async function requestUpgrade(
  slug: string,
): Promise<UpgradeActionResult> {
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

    const plan = upgradePlanForKit(await loadPlanCatalog(), slug);
    if (!plan) return { success: false, error: GENERIC_ERROR };

    await createSubscriptionRequest({
      vendorId: user.id,
      planSlug: plan.slug,
      kind: "upgrade",
      note: `Asked from the ${slug} card`,
    });
    return { success: true };
  } catch (err) {
    console.error("requestUpgrade: unexpected failure", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
