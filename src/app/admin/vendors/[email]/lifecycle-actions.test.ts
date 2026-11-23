import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  recordAudit: vi.fn(),
  revalidatePath: vi.fn(),
  loadPlanCatalog: vi.fn(),
  findVendorId: vi.fn(),
  loadVendorSubscriptions: vi.fn(),
  pauseSubscription: vi.fn(),
  endPause: vi.fn(),
  setScheduledPlan: vi.fn(),
  upgradeSubscription: vi.fn(),
  syncVendorEntitlements: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/admin", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/pricing/catalog", () => ({
  loadPlanCatalog: mocks.loadPlanCatalog,
}));
vi.mock("@/lib/entitlements/store", () => {
  class PauseError extends Error {
    constructor(readonly kind: string) {
      super(kind);
    }
  }
  return {
    PauseError,
    findVendorId: mocks.findVendorId,
    loadVendorSubscriptions: mocks.loadVendorSubscriptions,
    pauseSubscription: mocks.pauseSubscription,
    endPause: mocks.endPause,
    setScheduledPlan: mocks.setScheduledPlan,
    upgradeSubscription: mocks.upgradeSubscription,
  };
});
vi.mock("@/lib/entitlements/push", () => ({
  syncVendorEntitlements: mocks.syncVendorEntitlements,
}));

import { PauseError } from "@/lib/entitlements/store";
import {
  changePlanAction,
  clearScheduledPlanAction,
  endPauseAction,
  pauseSubscriptionAction,
} from "./lifecycle-actions";

const SUB = "11111111-1111-4111-8111-111111111111";
const PAUSE = "22222222-2222-4222-8222-222222222222";
const DAY = 86_400_000;

const plan = (
  slug: string,
  monthlyCents: number,
  kind = "kit",
  active = true,
) => ({
  slug,
  kind,
  active,
  monthlyCents,
  includedKits: ["qkit"],
  eventPass: null,
});

function row(extra: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: SUB,
    planSlug: "starter",
    interval: "month",
    status: "active",
    currentPeriodStart: new Date(now - 10 * DAY).toISOString(),
    currentPeriodEnd: new Date(now + 20 * DAY).toISOString(),
    renewalAnchor: new Date(now - 10 * DAY).toISOString(),
    lockedPriceCents: 1490,
    includedKits: ["qkit"],
    source: "admin_manual",
    founder: false,
    founderUntil: null,
    scheduledPlanSlug: null,
    pauses: [],
    ...extra,
  };
}

const pause = {
  email: "Vendor@Business.sg",
  subscriptionId: SUB,
  startsOn: "2026-11-10",
  endsOn: "2026-11-20",
  reason: "away",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "admin-1" } });
  mocks.findVendorId.mockResolvedValue("vendor-1");
  mocks.loadVendorSubscriptions.mockResolvedValue([row()]);
  mocks.loadPlanCatalog.mockResolvedValue([
    plan("starter", 1490, "starter"),
    plan("qkit", 1990),
    plan("cheap", 990, "starter"),
    plan("free", 0, "free"),
    plan("old", 3000, "kit", false),
  ]);
  mocks.pauseSubscription.mockResolvedValue("pause-1");
  mocks.upgradeSubscription.mockResolvedValue("sub-new");
  mocks.setScheduledPlan.mockResolvedValue(true);
  mocks.syncVendorEntitlements.mockResolvedValue([]);
});

describe("pauseSubscriptionAction", () => {
  it("pauses, audits, pushes and revalidates", async () => {
    expect(await pauseSubscriptionAction(pause)).toEqual({ success: true });
    expect(mocks.pauseSubscription).toHaveBeenCalledWith({
      subscriptionId: SUB,
      startsOn: "2026-11-10",
      endsOn: "2026-11-20",
      reason: "away",
      createdBy: "admin-1",
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "pause_subscription",
      "pause-1",
      expect.objectContaining({ days: 10 }),
    );
    expect(mocks.syncVendorEntitlements).toHaveBeenCalledWith({
      id: "vendor-1",
      email: "vendor@business.sg",
    });
  });

  it("rejects bad dates, empty and over-long spans before touching the db", async () => {
    for (const patch of [
      { startsOn: "soon" },
      { endsOn: "2026-11-10" },
      { endsOn: "2027-03-01" },
    ]) {
      const res = await pauseSubscriptionAction({ ...pause, ...patch });
      expect(res.success).toBe(false);
    }
    expect(mocks.pauseSubscription).not.toHaveBeenCalled();
  });

  it("refuses a vendor with no account or another vendor's subscription", async () => {
    mocks.findVendorId.mockResolvedValue(null);
    expect((await pauseSubscriptionAction(pause)).success).toBe(false);
    mocks.findVendorId.mockResolvedValue("vendor-1");
    mocks.loadVendorSubscriptions.mockResolvedValue([row({ id: PAUSE })]);
    expect((await pauseSubscriptionAction(pause)).success).toBe(false);
    expect(mocks.pauseSubscription).not.toHaveBeenCalled();
  });

  it("turns a database rule into a plain message", async () => {
    mocks.pauseSubscription.mockRejectedValue(new PauseError("cap"));
    expect(await pauseSubscriptionAction(pause)).toEqual({
      success: false,
      error: "That would pass 92 paused days in a year.",
    });
  });

  it("hides unexpected failures", async () => {
    mocks.pauseSubscription.mockRejectedValue(new Error("db down"));
    expect(await pauseSubscriptionAction(pause)).toEqual({
      success: false,
      error: "Could not save that. Try again.",
    });
  });
});

describe("endPauseAction", () => {
  const input = { email: "v@b.sg", pauseId: PAUSE };
  const withPause = () =>
    mocks.loadVendorSubscriptions.mockResolvedValue([
      row({ pauses: [{ id: PAUSE, startsOn: "a", endsOn: "b", reason: "" }] }),
    ]);

  it("ends the pause as of today and audits", async () => {
    withPause();
    expect(await endPauseAction(input)).toEqual({ success: true });
    expect(mocks.endPause).toHaveBeenCalledWith(
      PAUSE,
      new Date().toISOString().slice(0, 10),
    );
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "end_pause",
      PAUSE,
      { email: "v@b.sg" },
    );
  });

  it("refuses a pause the vendor does not own and bad ids", async () => {
    expect((await endPauseAction(input)).success).toBe(false);
    expect((await endPauseAction({ ...input, pauseId: "x" })).success).toBe(
      false,
    );
    mocks.findVendorId.mockResolvedValue(null);
    expect((await endPauseAction(input)).success).toBe(false);
    expect(mocks.endPause).not.toHaveBeenCalled();
  });

  it("maps a pause error and hides others", async () => {
    withPause();
    mocks.endPause.mockRejectedValueOnce(new PauseError("ended"));
    expect(await endPauseAction(input)).toEqual({
      success: false,
      error: "That pause has already ended.",
    });
    mocks.endPause.mockRejectedValueOnce(new Error("boom"));
    expect((await endPauseAction(input)).success).toBe(false);
  });
});

describe("changePlanAction", () => {
  const input = (planSlug: string) => ({
    email: "Vendor@Business.sg",
    subscriptionId: SUB,
    planSlug,
  });

  it("upgrades at once and reports the pro-rata amount owed", async () => {
    const res = await changePlanAction(input("qkit"));
    expect(res).toMatchObject({ success: true, kind: "upgrade" });
    expect(res.success && res.owedCents).toBeGreaterThan(0);
    expect(mocks.upgradeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorId: "vendor-1",
        priceCents: 1990,
        plan: expect.objectContaining({ slug: "qkit" }),
      }),
    );
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "upgrade_subscription",
      "sub-new",
      expect.objectContaining({ from: "starter", to: "qkit", replaced: SUB }),
    );
    expect(mocks.syncVendorEntitlements).toHaveBeenCalledTimes(1);
  });

  it("schedules a cheaper plan for the renewal date", async () => {
    const res = await changePlanAction(input("cheap"));
    expect(res).toMatchObject({ success: true, kind: "downgrade" });
    expect(mocks.setScheduledPlan).toHaveBeenCalledWith(
      "vendor-1",
      SUB,
      "cheap",
    );
    expect(mocks.upgradeSubscription).not.toHaveBeenCalled();
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "schedule_plan_change",
      SUB,
      expect.objectContaining({ to: "cheap" }),
    );
  });

  it("refuses closed rows, other sources, founders and the same plan", async () => {
    for (const extra of [
      { status: "canceled" },
      { source: "stripe" },
      { founder: true },
    ]) {
      mocks.loadVendorSubscriptions.mockResolvedValue([row(extra)]);
      expect((await changePlanAction(input("qkit"))).success).toBe(false);
    }
    mocks.loadVendorSubscriptions.mockResolvedValue([]);
    expect((await changePlanAction(input("qkit"))).success).toBe(false);
    mocks.loadVendorSubscriptions.mockResolvedValue([row()]);
    expect((await changePlanAction(input("starter"))).success).toBe(false);
    mocks.findVendorId.mockResolvedValue(null);
    expect((await changePlanAction(input("qkit"))).success).toBe(false);
    expect(mocks.upgradeSubscription).not.toHaveBeenCalled();
    expect(mocks.setScheduledPlan).not.toHaveBeenCalled();
  });

  it("refuses plans that are not on sale", async () => {
    for (const slug of ["free", "old", "missing"]) {
      expect(await changePlanAction(input(slug))).toEqual({
        success: false,
        error: "That plan is not on sale.",
      });
    }
  });

  it("blocks an upgrade while a pause is still open", async () => {
    const future = new Date(Date.now() + 5 * DAY).toISOString().slice(0, 10);
    mocks.loadVendorSubscriptions.mockResolvedValue([
      row({
        pauses: [{ id: PAUSE, startsOn: "a", endsOn: future, reason: "" }],
      }),
    ]);
    const res = await changePlanAction(input("qkit"));
    expect(res.success).toBe(false);
    expect(mocks.upgradeSubscription).not.toHaveBeenCalled();
  });

  it("reports a downgrade on a row that closed meanwhile", async () => {
    mocks.setScheduledPlan.mockResolvedValue(false);
    expect((await changePlanAction(input("cheap"))).success).toBe(false);
  });

  it("rejects a missing plan and hides unexpected failures", async () => {
    expect(
      (await changePlanAction({ ...input(""), planSlug: "" })).success,
    ).toBe(false);
    mocks.upgradeSubscription.mockRejectedValue(new Error("boom"));
    expect(await changePlanAction(input("qkit"))).toEqual({
      success: false,
      error: "Could not save that. Try again.",
    });
  });
});

describe("clearScheduledPlanAction", () => {
  const input = { email: "v@b.sg", subscriptionId: SUB };

  it("clears the scheduled plan and audits", async () => {
    expect(await clearScheduledPlanAction(input)).toEqual({ success: true });
    expect(mocks.setScheduledPlan).toHaveBeenCalledWith("vendor-1", SUB, null);
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "clear_scheduled_plan",
      SUB,
      { email: "v@b.sg" },
    );
  });

  it("fails on bad input, no account, a closed row or an error", async () => {
    expect(
      (await clearScheduledPlanAction({ ...input, subscriptionId: "x" }))
        .success,
    ).toBe(false);
    mocks.setScheduledPlan.mockResolvedValueOnce(false);
    expect((await clearScheduledPlanAction(input)).success).toBe(false);
    mocks.setScheduledPlan.mockRejectedValueOnce(new Error("boom"));
    expect((await clearScheduledPlanAction(input)).success).toBe(false);
    mocks.findVendorId.mockResolvedValue(null);
    expect((await clearScheduledPlanAction(input)).success).toBe(false);
  });
});
