import { getVendorActivity } from "@/lib/vendor-activity-client";
import { listLiveProducts } from "@/lib/products";
import { syncVendorEntitlements } from "./push";
import { normalizeEmail, TRIAL_LOOKUPS_PER_RUN } from "./trial";
import {
  loadTrialCandidates,
  markTrialChecked,
  startTrial,
} from "./trial-store";

const QKIT = "qkit";

export type FirstOrderCheck =
  | { kind: "started"; status: string }
  | { kind: "no_order" }
  | { kind: "unavailable" };

/** Ask qkit for the vendor's first order and, when there is one, start the
 *  trial from that date. A kit that does not report firstOrderAt yet never
 *  starts a trial: lastActivityAt is not a stand-in. */
export async function checkFirstOrderAndStart(
  vendor: { id: string; email: string },
  paynowUen: string | null = null,
): Promise<FirstOrderCheck> {
  const kit = (await listLiveProducts()).find((p) => p.slug === QKIT);
  if (!kit) return { kind: "unavailable" };

  const activity = await getVendorActivity(kit, vendor.email);
  if (!activity.ok || activity.data.firstOrderAt === undefined) {
    return { kind: "unavailable" };
  }
  if (activity.data.firstOrderAt === null) return { kind: "no_order" };

  const status = await startTrial({
    vendorId: vendor.id,
    emailNormalized: normalizeEmail(vendor.email),
    firstOrderAt: activity.data.firstOrderAt,
    paynowUen,
  });
  if (status === "active") await syncVendorEntitlements(vendor);
  return { kind: "started", status };
}

export interface SweepSummary {
  checked: number;
  started: number;
  blocked: number;
  noOrder: number;
  unavailable: number;
}

/** Sequential on purpose: qkit rate-limits per IP, so a run is capped and the
 *  oldest-checked vendors go first. */
export async function runTrialSweep(
  limit: number = TRIAL_LOOKUPS_PER_RUN,
): Promise<SweepSummary> {
  const candidates = await loadTrialCandidates(
    Math.min(limit, TRIAL_LOOKUPS_PER_RUN),
  );
  const summary: SweepSummary = {
    checked: 0,
    started: 0,
    blocked: 0,
    noOrder: 0,
    unavailable: 0,
  };
  for (const c of candidates) {
    summary.checked += 1;
    try {
      const r = await checkFirstOrderAndStart({
        id: c.vendorId,
        email: c.email,
      });
      if (r.kind === "started") {
        if (r.status === "blocked") summary.blocked += 1;
        else summary.started += 1;
      } else if (r.kind === "no_order") summary.noOrder += 1;
      else summary.unavailable += 1;
    } catch (err) {
      summary.unavailable += 1;
      console.error("trial sweep: vendor failed", err);
    }
    await markTrialChecked(c.vendorId);
  }
  return summary;
}
