import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  recordAudit: vi.fn(),
  revalidatePath: vi.fn(),
  loadPlanCatalog: vi.fn(),
  findVendorId: vi.fn(),
  grantSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  loadVendorSubscriptions: vi.fn(),
  mintEventPass: vi.fn(),
  cancelEventPass: vi.fn(),
  loadVendorEventPasses: vi.fn(),
  settleEventPass: vi.fn(),
  getEventPassUsage: vi.fn(),
  syncVendorEntitlements: vi.fn(),
  closeRequest: vi.fn(),
  getPendingRequest: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/admin", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/pricing/catalog", () => ({
  loadPlanCatalog: mocks.loadPlanCatalog,
}));
vi.mock("@/lib/entitlements/store", () => {
  class FounderCapError extends Error {}
  return {
    FounderCapError,
    findVendorId: mocks.findVendorId,
    grantSubscription: mocks.grantSubscription,
    cancelSubscription: mocks.cancelSubscription,
    loadVendorSubscriptions: mocks.loadVendorSubscriptions,
    mintEventPass: mocks.mintEventPass,
    cancelEventPass: mocks.cancelEventPass,
    loadVendorEventPasses: mocks.loadVendorEventPasses,
    settleEventPass: mocks.settleEventPass,
  };
});
vi.mock("@/lib/event-pass-usage-client", () => ({
  getEventPassUsage: mocks.getEventPassUsage,
}));
vi.mock("@/lib/entitlements/push", () => ({
  syncVendorEntitlements: mocks.syncVendorEntitlements,
}));
vi.mock("@/lib/subscription-requests", () => ({
  closeRequest: mocks.closeRequest,
  getPendingRequest: mocks.getPendingRequest,
}));

import { FounderCapError } from "@/lib/entitlements/store";
import {
  cancelEventPassAction,
  cancelSubscriptionAction,
  grantSubscriptionAction,
  mintEventPassAction,
  repushEntitlementsAction,
  settleEventPassAction,
} from "./subscription-actions";

const UUID = "11111111-1111-4111-8111-111111111111";
const REQ = "22222222-2222-4222-8222-222222222222";
const plan = (
  slug: string,
  kind: string,
  active = true,
  eventPass: unknown = null,
) => ({
  slug,
  kind,
  active,
  monthlyCents: 1990,
  includedKits: ["qkit", "printkit", "paykit"],
  eventPass,
});
const grant = {
  email: "Vendor@Business.sg",
  planSlug: "qkit",
  interval: "month" as const,
  priceCents: 1990,
  periodStart: "2026-11-02",
  renewalAnchor: "2026-11-02",
  founder: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "admin-1" } });
  mocks.loadPlanCatalog.mockResolvedValue([
    plan("qkit", "kit"),
    plan("starter", "starter"),
    plan("paykit", "kit", false),
    plan("free", "free"),
    plan("event_pass", "event_pass", true, { minCents: 1400, durationDays: 2 }),
  ]);
  mocks.findVendorId.mockResolvedValue("vendor-1");
  mocks.grantSubscription.mockResolvedValue("sub-1");
  mocks.cancelSubscription.mockResolvedValue(true);
  mocks.loadVendorSubscriptions.mockResolvedValue([]);
  mocks.mintEventPass.mockResolvedValue("pass-1");
  mocks.cancelEventPass.mockResolvedValue(true);
  mocks.syncVendorEntitlements.mockResolvedValue([]);
  mocks.getPendingRequest.mockResolvedValue({ id: REQ });
  mocks.closeRequest.mockResolvedValue(true);
});

describe("grantSubscriptionAction", () => {
  it("grants, audits, pushes and revalidates", async () => {
    expect(await grantSubscriptionAction(grant)).toEqual({ success: true });
    expect(mocks.grantSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorId: "vendor-1",
        priceCents: 1990,
        periodStart: new Date("2026-11-02T00:00:00.000Z"),
      }),
    );
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "grant_subscription",
      "sub-1",
      expect.objectContaining({ email: "vendor@business.sg", plan: "qkit" }),
    );
    expect(mocks.syncVendorEntitlements).toHaveBeenCalledWith({
      id: "vendor-1",
      email: "vendor@business.sg",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/requests");
    expect(mocks.closeRequest).not.toHaveBeenCalled();
  });

  it("replaces the vendor's other active plans by default and audits both", async () => {
    mocks.loadVendorSubscriptions.mockResolvedValue([
      { id: "sub-1", status: "active" },
      { id: "old-1", status: "active" },
      { id: "old-2", status: "canceled" },
    ]);
    await grantSubscriptionAction(grant);
    expect(mocks.cancelSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.cancelSubscription).toHaveBeenCalledWith("vendor-1", "old-1");
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "cancel_subscription",
      "old-1",
      { email: "vendor@business.sg", replaced_by: "sub-1" },
    );
    expect(mocks.syncVendorEntitlements).toHaveBeenCalledTimes(1);
  });

  it("still pushes and tells the admin when cancelling the old plan fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.loadVendorSubscriptions.mockRejectedValue(new Error("db down"));
    const res = await grantSubscriptionAction(grant);
    expect(res).toEqual({
      success: false,
      error:
        "Plan saved, but the old plan was not cancelled. Cancel it from the list.",
    });
    expect(mocks.syncVendorEntitlements).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/requests");
  });

  it("keeps the other active plans when replace is switched off", async () => {
    mocks.loadVendorSubscriptions.mockResolvedValue([
      { id: "old-1", status: "active" },
    ]);
    await grantSubscriptionAction({ ...grant, replaceCurrent: false });
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });

  it("does not audit a replaced plan that was already closed", async () => {
    mocks.loadVendorSubscriptions.mockResolvedValue([
      { id: "old-1", status: "active" },
    ]);
    mocks.cancelSubscription.mockResolvedValue(false);
    await grantSubscriptionAction(grant);
    expect(mocks.recordAudit).toHaveBeenCalledTimes(1);
  });

  it("resolves the request it answers", async () => {
    await grantSubscriptionAction({ ...grant, requestId: REQ });
    expect(mocks.closeRequest).toHaveBeenCalledWith(REQ, "resolved", "admin-1");
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "resolve_subscription_request",
      REQ,
      {},
    );
  });

  it("leaves a request alone when it is not pending for this vendor", async () => {
    mocks.getPendingRequest.mockResolvedValue(null);
    await grantSubscriptionAction({ ...grant, requestId: REQ });
    expect(mocks.closeRequest).not.toHaveBeenCalled();
  });

  it("does not audit a resolve when someone else closed the request first", async () => {
    mocks.closeRequest.mockResolvedValue(false);
    await grantSubscriptionAction({ ...grant, requestId: REQ });
    expect(mocks.recordAudit).toHaveBeenCalledTimes(1);
  });

  it("rejects bad input before any lookup", async () => {
    const res = await grantSubscriptionAction({
      ...grant,
      periodStart: "soon",
    });
    expect(res.success).toBe(false);
    expect(mocks.loadPlanCatalog).not.toHaveBeenCalled();
  });

  it("refuses plans that are inactive, unknown, free or not a subscription", async () => {
    for (const planSlug of ["paykit", "ghost", "free", "event_pass"]) {
      expect(await grantSubscriptionAction({ ...grant, planSlug })).toEqual({
        success: false,
        error: "That plan is not on sale.",
      });
    }
    expect(mocks.grantSubscription).not.toHaveBeenCalled();
  });

  it("asks for a sign-in when the vendor has no Merqo account", async () => {
    mocks.findVendorId.mockResolvedValue(null);
    const res = await grantSubscriptionAction(grant);
    expect(res).toMatchObject({ success: false });
    expect(mocks.grantSubscription).not.toHaveBeenCalled();
  });

  it("refuses a founder on a plan without Counter", async () => {
    expect(
      await grantSubscriptionAction({
        ...grant,
        planSlug: "starter",
        founder: true,
      }),
    ).toEqual({
      success: false,
      error: "Founders need a Counter subscription.",
    });
    expect(mocks.grantSubscription).not.toHaveBeenCalled();
  });

  it("explains a full founder cap", async () => {
    mocks.grantSubscription.mockRejectedValue(new FounderCapError());
    expect(await grantSubscriptionAction({ ...grant, founder: true })).toEqual({
      success: false,
      error: "All 20 founder slots are taken.",
    });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("returns a generic error on other failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.grantSubscription.mockRejectedValue(new Error("db down"));
    expect(await grantSubscriptionAction(grant)).toMatchObject({
      success: false,
    });
    expect(log).toHaveBeenCalled();
  });
});

describe("cancelSubscriptionAction", () => {
  it("cancels, audits and pushes", async () => {
    expect(
      await cancelSubscriptionAction({
        email: "vendor@business.sg",
        subscriptionId: UUID,
        requestId: REQ,
      }),
    ).toEqual({ success: true });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "cancel_subscription",
      UUID,
      { email: "vendor@business.sg" },
    );
    expect(mocks.closeRequest).toHaveBeenCalled();
    expect(mocks.syncVendorEntitlements).toHaveBeenCalled();
  });

  it("reports an already closed subscription and bad input", async () => {
    mocks.cancelSubscription.mockResolvedValue(false);
    expect(
      await cancelSubscriptionAction({
        email: "v@x.com",
        subscriptionId: UUID,
      }),
    ).toMatchObject({ success: false });
    expect(
      await cancelSubscriptionAction({ email: "v@x.com", subscriptionId: "x" }),
    ).toMatchObject({ success: false });
    mocks.findVendorId.mockResolvedValue(null);
    expect(
      await cancelSubscriptionAction({
        email: "v@x.com",
        subscriptionId: UUID,
      }),
    ).toMatchObject({ success: false });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("returns a generic error on failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.cancelSubscription.mockRejectedValue(new Error("db down"));
    expect(
      await cancelSubscriptionAction({
        email: "v@x.com",
        subscriptionId: UUID,
      }),
    ).toMatchObject({ success: false });
    expect(log).toHaveBeenCalled();
  });
});

describe("mintEventPassAction", () => {
  it("mints a window from the plan terms, defaulting the prepaid minimum", async () => {
    expect(
      await mintEventPassAction({ email: "v@x.com", startsAt: "2026-12-01" }),
    ).toEqual({ success: true });
    expect(mocks.mintEventPass).toHaveBeenCalledWith({
      vendorId: "vendor-1",
      startsAt: new Date("2026-11-30T16:00:00.000Z"),
      endsAt: new Date("2026-12-02T16:00:00.000Z"),
      prepaidCents: 1400,
      createdBy: "admin-1",
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "mint_event_pass",
      "pass-1",
      expect.objectContaining({ prepaid_cents: 1400 }),
    );
  });

  it("honours an explicit prepaid amount", async () => {
    await mintEventPassAction({
      email: "v@x.com",
      startsAt: "2026-12-01",
      prepaidCents: 2000,
    });
    expect(mocks.mintEventPass).toHaveBeenCalledWith(
      expect.objectContaining({ prepaidCents: 2000 }),
    );
  });

  it("refuses when passes are not on sale, the vendor is unknown or input is bad", async () => {
    mocks.loadPlanCatalog.mockResolvedValue([
      plan("event_pass", "event_pass", false, null),
    ]);
    expect(
      await mintEventPassAction({ email: "v@x.com", startsAt: "2026-12-01" }),
    ).toMatchObject({ success: false });
    mocks.loadPlanCatalog.mockResolvedValue([
      plan("event_pass", "event_pass", true, {
        minCents: 1400,
        durationDays: 2,
      }),
    ]);
    mocks.findVendorId.mockResolvedValue(null);
    expect(
      await mintEventPassAction({ email: "v@x.com", startsAt: "2026-12-01" }),
    ).toMatchObject({ success: false });
    expect(
      await mintEventPassAction({ email: "v@x.com", startsAt: "tomorrow" }),
    ).toMatchObject({ success: false });
    expect(mocks.mintEventPass).not.toHaveBeenCalled();
  });

  it("returns a generic error on failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.mintEventPass.mockRejectedValue(new Error("db down"));
    expect(
      await mintEventPassAction({ email: "v@x.com", startsAt: "2026-12-01" }),
    ).toMatchObject({ success: false });
    expect(log).toHaveBeenCalled();
  });
});

describe("cancelEventPassAction", () => {
  it("cancels, audits and pushes", async () => {
    expect(
      await cancelEventPassAction({ email: "v@x.com", passId: UUID }),
    ).toEqual({ success: true });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "cancel_event_pass",
      UUID,
      { email: "v@x.com" },
    );
    expect(mocks.syncVendorEntitlements).toHaveBeenCalled();
  });

  it("reports closed passes, bad input and failures", async () => {
    mocks.cancelEventPass.mockResolvedValue(false);
    expect(
      await cancelEventPassAction({ email: "v@x.com", passId: UUID }),
    ).toMatchObject({ success: false });
    expect(
      await cancelEventPassAction({ email: "v@x.com", passId: "x" }),
    ).toMatchObject({ success: false });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.cancelEventPass.mockRejectedValue(new Error("db down"));
    expect(
      await cancelEventPassAction({ email: "v@x.com", passId: UUID }),
    ).toMatchObject({ success: false });
    expect(log).toHaveBeenCalled();
  });
});

describe("settleEventPassAction", () => {
  const input = { email: "v@x.com", passId: UUID };
  const endedPass = (over: Record<string, unknown> = {}) => ({
    id: UUID,
    startsAt: "2020-01-01T00:00:00.000Z",
    endsAt: "2020-01-03T00:00:00.000Z",
    prepaidCents: 1400,
    status: "active",
    ...over,
  });

  beforeEach(() => {
    mocks.loadPlanCatalog.mockResolvedValue([
      plan("event_pass", "event_pass", true, {
        perCupCents: 15,
        minCents: 1400,
        capCents: 2800,
        durationDays: 2,
      }),
    ]);
    mocks.loadVendorEventPasses.mockResolvedValue([endedPass()]);
    mocks.getEventPassUsage.mockResolvedValue({ ok: true, cups: 150 });
    mocks.settleEventPass.mockResolvedValue(true);
  });

  it("re-reads cups server-side, stores the top-up and audits", async () => {
    expect(await settleEventPassAction(input)).toEqual({ success: true });
    expect(mocks.getEventPassUsage).toHaveBeenCalledWith({
      vendorId: "vendor-1",
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2020-01-03T00:00:00.000Z",
    });
    expect(mocks.settleEventPass).toHaveBeenCalledWith({
      vendorId: "vendor-1",
      passId: UUID,
      cups: 150,
      cents: 850,
      settledBy: "admin-1",
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "settle_event_pass",
      UUID,
      expect.objectContaining({ cups: 150, settled_cents: 850 }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("never lets the top-up go negative for a small prepaid shortfall", async () => {
    mocks.getEventPassUsage.mockResolvedValue({ ok: true, cups: 10 });
    await settleEventPassAction(input);
    expect(mocks.settleEventPass).toHaveBeenCalledWith(
      expect.objectContaining({ cups: 10, cents: 0 }),
    );
  });

  it("refuses when usage is unavailable", async () => {
    mocks.getEventPassUsage.mockResolvedValue({ ok: false });
    expect(await settleEventPassAction(input)).toMatchObject({
      success: false,
      error: expect.stringContaining("unavailable"),
    });
    expect(mocks.settleEventPass).not.toHaveBeenCalled();
  });

  it("refuses a pass that has not ended", async () => {
    mocks.loadVendorEventPasses.mockResolvedValue([
      endedPass({ endsAt: "2999-01-01T00:00:00.000Z" }),
    ]);
    expect(await settleEventPassAction(input)).toMatchObject({
      success: false,
      error: expect.stringContaining("hasn't ended"),
    });
    expect(mocks.getEventPassUsage).not.toHaveBeenCalled();
  });

  it.each(["settled", "cancelled"])("refuses a %s pass", async (status) => {
    mocks.loadVendorEventPasses.mockResolvedValue([endedPass({ status })]);
    expect(await settleEventPassAction(input)).toMatchObject({
      success: false,
      error: "That event pass is already closed.",
    });
    expect(mocks.settleEventPass).not.toHaveBeenCalled();
  });

  it("reports a concurrent settle that lost the race", async () => {
    mocks.settleEventPass.mockResolvedValue(false);
    expect(await settleEventPassAction(input)).toMatchObject({
      success: false,
    });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("rejects another vendor's or an unknown pass and bad input", async () => {
    mocks.loadVendorEventPasses.mockResolvedValue([]);
    expect(await settleEventPassAction(input)).toMatchObject({
      success: false,
    });
    expect(
      await settleEventPassAction({ email: "nope", passId: "x" }),
    ).toMatchObject({ success: false });
    expect(mocks.settleEventPass).not.toHaveBeenCalled();
  });

  it("returns a generic error on failure", async () => {
    mocks.settleEventPass.mockRejectedValue(new Error("db"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await settleEventPassAction(input)).toEqual({
      success: false,
      error: "Could not save that. Try again.",
    });
  });
});

describe("repushEntitlementsAction", () => {
  it("counts accepted and failed pushes and audits", async () => {
    mocks.syncVendorEntitlements.mockResolvedValue([
      { kit: "qkit", result: { ok: true, status: 200 } },
      { kit: "loopkit", result: { ok: false, status: 404, kind: "http" } },
    ]);
    expect(await repushEntitlementsAction({ email: "v@x.com" })).toEqual({
      success: true,
      pushed: 1,
      failed: 1,
    });
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "repush_entitlements",
      "vendor-1",
      { email: "v@x.com" },
    );
  });

  it("rejects bad input, unknown vendors and failures", async () => {
    expect(await repushEntitlementsAction({ email: "nope" })).toMatchObject({
      success: false,
    });
    mocks.findVendorId.mockResolvedValue(null);
    expect(await repushEntitlementsAction({ email: "v@x.com" })).toMatchObject({
      success: false,
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findVendorId.mockRejectedValue(new Error("db down"));
    expect(await repushEntitlementsAction({ email: "v@x.com" })).toMatchObject({
      success: false,
    });
    expect(log).toHaveBeenCalled();
  });
});
