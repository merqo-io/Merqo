import { fetchKitJson } from "@/lib/kit-action-request";
import { loadPlanCatalog } from "@/lib/pricing/catalog";
import { listEntitlementTargets, type RegistryRow } from "@/lib/products";
import { createServiceClient } from "@/lib/supabase/server";
import { entitlementResponseSchema, type EntitlementPayload } from "./contract";
import { deriveEntitlements } from "./derive";
import {
  findVendorId,
  loadVendorEventPasses,
  loadVendorSubscriptions,
} from "./store";

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
      last_error_kind: result.ok ? null : result.kind,
      last_attempt_at: nowIso,
      ...(result.ok ? { last_success_at: nowIso } : {}),
    },
    { onConflict: "vendor_id,kit_slug" },
  );
  if (error) console.error("entitlement sync: record failed", error.message);

  await mirrorPlan(supabase, payload.email, payload.kit, payload.tier);
}

async function mirrorPlan(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  email: string,
  kit: string,
  tier: string,
): Promise<void> {
  // The derived tier is the dashboard's plan; kits no longer report one.
  const { error } = await supabase
    .from("vendor_links")
    .update({ plan: tier })
    .eq("email", email.toLowerCase())
    .eq("product_slug", kit);
  if (error)
    console.error("entitlement sync: plan mirror failed", error.message);
}

async function deriveForVendor(vendorId: string, now: Date) {
  const [subscriptions, eventPasses, catalog, targets] = await Promise.all([
    loadVendorSubscriptions(vendorId),
    loadVendorEventPasses(vendorId),
    loadPlanCatalog(),
    listEntitlementTargets(),
  ]);
  const derived = deriveEntitlements({
    subscriptions,
    eventPasses,
    catalog,
    liveKits: targets.map((k) => k.slug),
    now,
  });
  return { derived, targets };
}

/** Rewrite vendor_links.plan from merqo's records without contacting any kit,
 *  so legacy kit-reported values and lapsed subscriptions are corrected on
 *  the normal dashboard sync. A vendor with no Merqo account has no records
 *  to derive from and is left alone. Never throws. */
export async function mirrorDerivedPlans(email: string): Promise<void> {
  try {
    const vendorId = await findVendorId(email.toLowerCase());
    if (!vendorId) return;
    const { derived } = await deriveForVendor(vendorId, new Date());
    const supabase = await createServiceClient();
    await Promise.all(
      Object.entries(derived).map(([kit, e]) =>
        mirrorPlan(supabase, email, kit, e.tier),
      ),
    );
  } catch (err) {
    console.error("entitlement sync: plan mirror failed", err);
  }
}

/** Derive a vendor's entitlements from merqo's own records and push them to
 *  the live and push-only kits (all of them, or just `opts.kits`). Never throws. */
export async function syncVendorEntitlements(
  vendor: { id: string; email: string },
  opts: { kits?: string[]; now?: Date; timeoutMs?: number } = {},
): Promise<KitPushOutcome[]> {
  try {
    const now = opts.now ?? new Date();
    const { derived, targets: all } = await deriveForVendor(vendor.id, now);
    const targets = all.filter((k) => !opts.kits || opts.kits.includes(k.slug));
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
    return settled.map((s, i): KitPushOutcome => {
      if (s.status === "fulfilled") return s.value;
      console.error("entitlement sync: push failed", s.reason);
      return {
        kit: targets[i].slug,
        result: { ok: false, status: null, kind: "network" },
      };
    });
  } catch (err) {
    console.error("entitlement sync: unexpected failure", err);
    return [];
  }
}
