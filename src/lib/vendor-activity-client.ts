import { z } from "zod";
import {
  vendorActivityPayloadSchema,
  type VendorActivityPayload,
} from "@merqo/ui/contracts";
import type { RegistryRow } from "@/lib/products";
import { fetchKitJson } from "@/lib/kit-action-request";

type VendorActivitySource = Pick<
  RegistryRow,
  "slug" | "app_url" | "metrics_secret"
>;

export type VendorActivityData = VendorActivityPayload & {
  firstOrderAt?: string | null;
};

export type VendorActivityResult =
  | { ok: true; slug: string; data: VendorActivityData }
  | { ok: false; slug: string };

const firstOrderSchema = z.object({
  firstOrderAt: z.string().datetime({ offset: true }).nullable(),
});

// Kits that have not shipped firstOrderAt yet still validate; a malformed
// value is dropped rather than failing the whole card.
const activitySchema = {
  safeParse(
    input: unknown,
  ): { success: true; data: VendorActivityData } | { success: false } {
    const base = vendorActivityPayloadSchema.safeParse(input);
    if (!base.success) return { success: false };
    const first = firstOrderSchema.safeParse(input);
    return {
      success: true,
      data: first.success
        ? { ...base.data, firstOrderAt: first.data.firstOrderAt }
        : base.data,
    };
  },
};

/** One kit's cross-schema activity summary for a single vendor — the
 *  `/admin/vendors/[email]` detail page's per-kit card. Never throws, same
 *  degrade-on-anything convention as fetchProductMetrics/checkVendorStatus:
 *  a kit that hasn't implemented this endpoint yet, 404s (vendor never
 *  touched it), or is briefly down all collapse to `ok: false` so the page
 *  just renders no card for that kit rather than an error. */
export async function getVendorActivity(
  kit: VendorActivitySource,
  email: string,
  opts: { timeoutMs?: number } = {},
): Promise<VendorActivityResult> {
  if (!kit.app_url || !kit.metrics_secret) {
    return { ok: false, slug: kit.slug };
  }

  let url: URL;
  try {
    url = new URL("/api/merqo/vendor-activity", kit.app_url);
    url.searchParams.set("email", email);
  } catch {
    return { ok: false, slug: kit.slug };
  }

  const result = await fetchKitJson(
    url,
    activitySchema,
    { headers: { Authorization: `Bearer ${kit.metrics_secret}` } },
    opts.timeoutMs ?? 3000,
  );
  if (!result.ok) return { ok: false, slug: kit.slug };
  return { ok: true, slug: kit.slug, data: result.data };
}
