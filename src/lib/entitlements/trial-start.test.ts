import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listLiveProducts: vi.fn(),
  getVendorActivity: vi.fn(),
  syncVendorEntitlements: vi.fn(),
  loadTrialCandidates: vi.fn(),
  markTrialChecked: vi.fn(),
  startTrial: vi.fn(),
}));
vi.mock("@/lib/products", () => ({ listLiveProducts: mocks.listLiveProducts }));
vi.mock("@/lib/vendor-activity-client", () => ({
  getVendorActivity: mocks.getVendorActivity,
}));
vi.mock("./push", () => ({
  syncVendorEntitlements: mocks.syncVendorEntitlements,
}));
vi.mock("./trial-store", () => ({
  loadTrialCandidates: mocks.loadTrialCandidates,
  markTrialChecked: mocks.markTrialChecked,
  startTrial: mocks.startTrial,
}));

import { checkFirstOrderAndStart, runTrialSweep } from "./trial-start";
import { TRIAL_LOOKUPS_PER_RUN } from "./trial";

const vendor = { id: "v1", email: "J.Doe+x@Gmail.com" };
const activity = (data: Record<string, unknown>) => ({
  ok: true,
  slug: "qkit",
  data,
});

describe("checkFirstOrderAndStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listLiveProducts.mockResolvedValue([{ slug: "qkit" }]);
    mocks.startTrial.mockResolvedValue("active");
  });

  it("starts the trial from the first order with a normalised email", async () => {
    mocks.getVendorActivity.mockResolvedValue(
      activity({ firstOrderAt: "2026-11-01T00:00:00.000Z" }),
    );
    expect(await checkFirstOrderAndStart(vendor, "201912345A")).toEqual({
      kind: "started",
      status: "active",
    });
    expect(mocks.startTrial).toHaveBeenCalledWith({
      vendorId: "v1",
      emailNormalized: "jdoe@gmail.com",
      firstOrderAt: "2026-11-01T00:00:00.000Z",
      paynowUen: "201912345A",
    });
    expect(mocks.syncVendorEntitlements).toHaveBeenCalledWith(vendor);
  });

  it("does not push entitlements for a blocked trial", async () => {
    mocks.startTrial.mockResolvedValue("blocked");
    mocks.getVendorActivity.mockResolvedValue(
      activity({ firstOrderAt: "2026-11-01T00:00:00.000Z" }),
    );
    await checkFirstOrderAndStart(vendor);
    expect(mocks.syncVendorEntitlements).not.toHaveBeenCalled();
  });

  it("starts nothing when qkit does not report firstOrderAt", async () => {
    mocks.getVendorActivity.mockResolvedValue(
      activity({ lastActivityAt: "2026-11-01T00:00:00.000Z" }),
    );
    expect(await checkFirstOrderAndStart(vendor)).toEqual({
      kind: "unavailable",
    });
    expect(mocks.startTrial).not.toHaveBeenCalled();
  });

  it("starts nothing when there is no order yet", async () => {
    mocks.getVendorActivity.mockResolvedValue(activity({ firstOrderAt: null }));
    expect(await checkFirstOrderAndStart(vendor)).toEqual({ kind: "no_order" });
    expect(mocks.startTrial).not.toHaveBeenCalled();
  });

  it("starts nothing when the lookup fails", async () => {
    mocks.getVendorActivity.mockResolvedValue({ ok: false, slug: "qkit" });
    expect(await checkFirstOrderAndStart(vendor)).toEqual({
      kind: "unavailable",
    });
  });
});

describe("runTrialSweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listLiveProducts.mockResolvedValue([{ slug: "qkit" }]);
    mocks.startTrial.mockResolvedValue("active");
    mocks.getVendorActivity.mockResolvedValue(
      activity({ firstOrderAt: "2026-11-01T00:00:00.000Z" }),
    );
  });

  it("never asks for more than 25 candidates, even if told to", async () => {
    mocks.loadTrialCandidates.mockResolvedValue([]);
    await runTrialSweep(500);
    expect(mocks.loadTrialCandidates).toHaveBeenCalledWith(
      TRIAL_LOOKUPS_PER_RUN,
    );
    expect(TRIAL_LOOKUPS_PER_RUN).toBe(25);
  });

  it("looks vendors up one at a time and marks each as checked", async () => {
    mocks.loadTrialCandidates.mockResolvedValue([
      { vendorId: "a", email: "a@x.test" },
      { vendorId: "b", email: "b@x.test" },
    ]);
    let inFlight = 0;
    let peak = 0;
    mocks.getVendorActivity.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return activity({ firstOrderAt: "2026-11-01T00:00:00.000Z" });
    });
    const summary = await runTrialSweep();
    expect(peak).toBe(1);
    expect(summary).toMatchObject({ checked: 2, started: 2 });
    expect(mocks.markTrialChecked).toHaveBeenCalledTimes(2);
  });

  it("keeps going when one vendor fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.loadTrialCandidates.mockResolvedValue([
      { vendorId: "a", email: "a@x.test" },
      { vendorId: "b", email: "b@x.test" },
    ]);
    mocks.startTrial.mockRejectedValueOnce(new Error("boom"));
    const summary = await runTrialSweep();
    expect(summary).toMatchObject({ checked: 2, started: 1, unavailable: 1 });
  });

  it("counts blocked, no-order and unreported vendors separately", async () => {
    mocks.loadTrialCandidates.mockResolvedValue([
      { vendorId: "a", email: "a@x.test" },
      { vendorId: "b", email: "b@x.test" },
      { vendorId: "c", email: "c@x.test" },
    ]);
    mocks.startTrial.mockResolvedValueOnce("blocked");
    mocks.getVendorActivity
      .mockResolvedValueOnce(
        activity({ firstOrderAt: "2026-11-01T00:00:00.000Z" }),
      )
      .mockResolvedValueOnce(activity({ firstOrderAt: null }))
      .mockResolvedValueOnce(activity({}));
    const summary = await runTrialSweep();
    expect(summary).toMatchObject({
      checked: 3,
      blocked: 1,
      noOrder: 1,
      unavailable: 1,
    });
  });
});
