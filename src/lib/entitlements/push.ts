import { fetchKitJson } from "@/lib/kit-action-request";
import { loadPlanCatalog } from "@/lib/pricing/catalog";
import { listLiveProducts, type RegistryRow } from "@/lib/products";
import { createServiceClient } from "@/lib/supabase/server";
import { entitlementResponseSchema, type EntitlementPayload } from "./contract";
import { deriveEntitlements } from "./derive";
import { loadVendorEventPasses, loadVendorSubscriptions } from "./store";

type PushTarget = Pick<RegistryRow, "slug" | "app_url" | "provision_secret">;

export type PushResult =
  | { ok: true; status: number }
  | {
      ok: false;
      status: number | null;
      kind: "unconfigured" | "network" | "http" | "parse" | "schema";
    };

/** POST one kit's entitlement. Never throws: a kit without the route yet
 *  (404), a timeout or a network error is a recorded result, not a failure of
 *  the admin action that triggered the push. */
export async function pushKitEntitlement(
  kit: PushTarget,
  payload: EntitlementPayload,
  opts: { timeoutMs?: number } = {},
): Promise<PushResult> {
  if (!kit.app_url || !kit.provision_secret) {
    return { ok: false, status: null, kind: "unconfigured" };
  }
  let url: URL;
  try {
    url = new URL("/api/merqo/entitlement", kit.app_url);
  } catch {
    return { ok: false, status: null, kind: "unconfigured" };
  }
  const result = await fetchKitJson(
    url,
    entitlementResponseSchema,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kit.provision_secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    opts.timeoutMs ?? 5000,
  );
  return result.ok
    ? { ok: true, status: result.status }
    : { ok: false, status: result.status, kind: result.kind };
}

export interface KitPushOutcome {
  kit: string;
  result: PushResult;
}

function syncStatus(result: PushResult): "ok" | "failed" | "skipped" {
  if (result.ok) return "ok";
  return result.kind === "unconfigured" ? "skipped" : "failed";
}

async function recordPush(
  vendorId: string,
  payload: EntitlementPayload,
  result: PushResult,
): Promise<void> {
  const supabase = await createServiceClient();
  const nowIso = new Date().toISOString();
  const status = syncStatus(result);
  const { error } = await supabase.from("entitlement_sync").upsert(
    {
      vendor_id: vendorId,
      kit_slug: payload.kit,
      payload,
      last_status: status,
      last_http_status: result.status,
      last_attempt_at: nowIso,
      ...(result.ok ? { last_success_at: nowIso } : {}),
    },
    { onConflict: "vendor_id,kit_slug" },
  );
  if (error) console.error("entitlement sync: record failed", error.message);

  // The derived tier is the dashboard's plan; kits no longer report one.
  const { error: linkError } = await supabase
    .from("vendor_links")
    .update({ plan: payload.tier })
    .eq("email", payload.email.toLowerCase())
    .eq("product_slug", payload.kit);
  if (linkError) {
    console.error("entitlement sync: plan mirror failed", linkError.message);
  }
}

/** Derive a vendor's entitlements from merqo's own records and push them to
 *  the live kits (all of them, or just `opts.kits`). Never throws. */
export async function syncVendorEntitlements(
  vendor: { id: string; email: string },
  opts: { kits?: string[]; now?: Date; timeoutMs?: number } = {},
): Promise<KitPushOutcome[]> {
  try {
    const now = opts.now ?? new Date();
    const [subscriptions, eventPasses, catalog, live] = await Promise.all([
      loadVendorSubscriptions(vendor.id),
      loadVendorEventPasses(vendor.id),
      loadPlanCatalog(),
      listLiveProducts(),
    ]);
    const derived = deriveEntitlements({
      subscriptions,
      eventPasses,
      catalog,
      liveKits: live.map((k) => k.slug),
      now,
    });
    const targets = live.filter(
      (k) => !opts.kits || opts.kits.includes(k.slug),
    );
    const settled = await Promise.allSettled(
      targets.map(async (kit): Promise<KitPushOutcome> => {
        const payload: EntitlementPayload = {
          email: vendor.email.toLowerCase(),
          kit: kit.slug,
          ...derived[kit.slug],
          issued_at: now.toISOString(),
        };
        const result = await pushKitEntitlement(kit, payload, {
          timeoutMs: opts.timeoutMs,
        });
        await recordPush(vendor.id, payload, result);
        return { kit: kit.slug, result };
      }),
    );
    return settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  } catch (err) {
    console.error("entitlement sync: unexpected failure", err);
    return [];
  }
}
