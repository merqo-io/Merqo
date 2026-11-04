import { z } from "zod";
import { fetchKitJson } from "@/lib/kit-action-request";
import { listLiveProducts, type RegistryRow } from "@/lib/products";

const USAGE_KIT_SLUG = "qkit";

const usagePayloadSchema = z.object({
  vendor_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  cups: z.number().int().min(0),
});

type UsageSource = Pick<RegistryRow, "slug" | "app_url" | "metrics_secret">;

export interface EventPassWindow {
  vendorId: string;
  startsAt: string;
  endsAt: string;
}

export type EventPassUsageResult = { ok: true; cups: number } | { ok: false };

/** Cups a vendor sold on the usage kit inside one pass window. Never throws:
 *  an unconfigured, down or mismatching kit degrades to `ok: false` so the
 *  admin sees "usage unavailable" and settle stays disabled instead of
 *  settling on a guess. */
export async function fetchEventPassUsage(
  kit: UsageSource,
  window: EventPassWindow,
  opts: { timeoutMs?: number } = {},
): Promise<EventPassUsageResult> {
  if (!kit.app_url || !kit.metrics_secret) return { ok: false };

  let url: URL;
  try {
    url = new URL("/api/merqo/event-pass-usage", kit.app_url);
  } catch {
    return { ok: false };
  }
  url.searchParams.set("vendor_id", window.vendorId);
  url.searchParams.set("starts_at", window.startsAt);
  url.searchParams.set("ends_at", window.endsAt);

  const result = await fetchKitJson(
    url,
    usagePayloadSchema,
    { headers: { Authorization: `Bearer ${kit.metrics_secret}` } },
    opts.timeoutMs ?? 3000,
  );
  // A reply for a different vendor must never be billed to this one.
  if (!result.ok || result.data.vendor_id !== window.vendorId) {
    return { ok: false };
  }
  return { ok: true, cups: result.data.cups };
}

/** Resolves the usage kit from the live registry, then fetches the window. */
export async function getEventPassUsage(
  window: EventPassWindow,
): Promise<EventPassUsageResult> {
  try {
    const kit = (await listLiveProducts()).find(
      (p) => p.slug === USAGE_KIT_SLUG,
    );
    if (!kit) return { ok: false };
    return await fetchEventPassUsage(kit, window);
  } catch {
    return { ok: false };
  }
}
