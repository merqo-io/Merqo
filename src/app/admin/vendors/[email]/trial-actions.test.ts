import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  recordAudit: vi.fn(),
  revalidatePath: vi.fn(),
  findVendorId: vi.fn(),
  overrideTrial: vi.fn(),
  setTrialUen: vi.fn(),
  checkFirstOrderAndStart: vi.fn(),
  syncVendorEntitlements: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/admin", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/entitlements/store", () => ({
  findVendorId: mocks.findVendorId,
}));
vi.mock("@/lib/entitlements/trial-store", () => ({
  overrideTrial: mocks.overrideTrial,
  setTrialUen: mocks.setTrialUen,
}));
vi.mock("@/lib/entitlements/trial-start", () => ({
  checkFirstOrderAndStart: mocks.checkFirstOrderAndStart,
}));
vi.mock("@/lib/entitlements/push", () => ({
  syncVendorEntitlements: mocks.syncVendorEntitlements,
}));

import {
  checkFirstOrderAction,
  overrideTrialAction,
  setTrialUenAction,
} from "./trial-actions";

describe("trial actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.findVendorId.mockResolvedValue("vendor-1");
  });

  it("requires a reason to override", async () => {
    const res = await overrideTrialAction({ email: "v@x.com", reason: " " });
    expect(res.success).toBe(false);
    expect(mocks.overrideTrial).not.toHaveBeenCalled();
  });

  it("overrides with a normalised email, audits and pushes", async () => {
    mocks.overrideTrial.mockResolvedValue("overridden");
    const res = await overrideTrialAction({
      email: "J.Doe+a@Gmail.com",
      reason: "Same owner, new login",
    });
    expect(res.success).toBe(true);
    expect(mocks.overrideTrial).toHaveBeenCalledWith({
      vendorId: "vendor-1",
      emailNormalized: "jdoe@gmail.com",
      adminId: "admin-1",
      reason: "Same owner, new login",
      paynowUen: null,
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "override_trial",
      "vendor-1",
      expect.anything(),
    );
    expect(mocks.syncVendorEntitlements).toHaveBeenCalled();
  });

  it("refuses a vendor with no account", async () => {
    mocks.findVendorId.mockResolvedValue(null);
    const res = await overrideTrialAction({
      email: "v@x.com",
      reason: "Because",
    });
    expect(res.success).toBe(false);
  });

  it("rejects a malformed UEN", async () => {
    const res = await setTrialUenAction({ email: "v@x.com", paynowUen: "no!" });
    expect(res.success).toBe(false);
    expect(mocks.setTrialUen).not.toHaveBeenCalled();
  });

  it("re-pushes when a UEN match blocks the trial", async () => {
    mocks.setTrialUen.mockResolvedValue("blocked");
    const res = await setTrialUenAction({
      email: "v@x.com",
      paynowUen: "201912345a",
    });
    expect(mocks.setTrialUen).toHaveBeenCalledWith("vendor-1", "201912345A");
    expect(res).toMatchObject({ success: true });
    expect(mocks.syncVendorEntitlements).toHaveBeenCalled();
  });

  it("reports no trial row when saving a UEN too early", async () => {
    mocks.setTrialUen.mockResolvedValue(null);
    const res = await setTrialUenAction({
      email: "v@x.com",
      paynowUen: "201912345A",
    });
    expect(res.success).toBe(false);
  });

  it("reports a kit that did not report a first order date", async () => {
    mocks.checkFirstOrderAndStart.mockResolvedValue({ kind: "unavailable" });
    const res = await checkFirstOrderAction({ email: "v@x.com" });
    expect(res.success).toBe(false);
  });

  it("reports no first order yet as a normal result", async () => {
    mocks.checkFirstOrderAndStart.mockResolvedValue({ kind: "no_order" });
    const res = await checkFirstOrderAction({ email: "v@x.com" });
    expect(res).toMatchObject({
      success: true,
      message: "No first order yet.",
    });
  });

  it("refuses a vendor who has had a paid plan", async () => {
    mocks.checkFirstOrderAndStart.mockResolvedValue({
      kind: "started",
      status: "ineligible",
    });
    const res = await checkFirstOrderAction({ email: "v@x.com" });
    expect(res).toEqual({
      success: false,
      error: "This vendor has had a paid plan, so no trial applies.",
    });
  });

  it("says so when the first order matches an earlier trial", async () => {
    mocks.checkFirstOrderAndStart.mockResolvedValue({
      kind: "started",
      status: "blocked",
    });
    const res = await checkFirstOrderAction({ email: "v@x.com" });
    expect(res).toMatchObject({
      success: true,
      message: "A trial was already used for this email or PayNow/UEN.",
    });
  });

  it("confirms a recorded trial", async () => {
    mocks.checkFirstOrderAndStart.mockResolvedValue({
      kind: "started",
      status: "active",
    });
    const res = await checkFirstOrderAction({ email: "v@x.com" });
    expect(res).toMatchObject({ success: true, message: "Trial recorded." });
  });

  it("returns a generic error when a check throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.checkFirstOrderAndStart.mockRejectedValue(new Error("boom"));
    const res = await checkFirstOrderAction({ email: "v@x.com" });
    expect(res.success).toBe(false);
  });

  it("returns a generic error when saving a UEN throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.setTrialUen.mockRejectedValue(new Error("boom"));
    const res = await setTrialUenAction({
      email: "v@x.com",
      paynowUen: "201912345A",
    });
    expect(res.success).toBe(false);
  });

  it("returns a generic error when an override throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.overrideTrial.mockRejectedValue(new Error("boom"));
    const res = await overrideTrialAction({
      email: "v@x.com",
      reason: "Because",
    });
    expect(res.success).toBe(false);
  });
});
