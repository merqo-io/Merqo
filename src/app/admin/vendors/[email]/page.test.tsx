// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  requireMerqoTeamMock,
  getVendorGrantMock,
  listProductsMock,
  listLiveProductsMock,
  getVendorActivityMock,
  recordAuditMock,
  notFoundMock,
  findVendorIdMock,
  countFoundersMock,
  getPendingRequestMock,
} = vi.hoisted(() => ({
  findVendorIdMock: vi.fn(),
  countFoundersMock: vi.fn(),
  getPendingRequestMock: vi.fn(),
  requireMerqoTeamMock: vi.fn(),
  getVendorGrantMock: vi.fn(),
  listProductsMock: vi.fn(),
  listLiveProductsMock: vi.fn(),
  getVendorActivityMock: vi.fn(),
  recordAuditMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/team", () => ({ requireMerqoTeam: requireMerqoTeamMock }));
vi.mock("@/lib/admin", () => ({
  getVendorGrant: getVendorGrantMock,
  listProducts: listProductsMock,
  recordAudit: recordAuditMock,
}));
vi.mock("@/lib/products", () => ({ listLiveProducts: listLiveProductsMock }));
vi.mock("@/lib/vendor-activity-client", () => ({
  getVendorActivity: getVendorActivityMock,
}));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/lib/entitlements/store", () => ({
  FOUNDER_CAP: 20,
  findVendorId: findVendorIdMock,
  countFounders: countFoundersMock,
  loadVendorSubscriptions: vi.fn().mockResolvedValue([
    {
      id: "sub-1",
      planSlug: "qkit",
      interval: "month",
      status: "active",
      currentPeriodStart: "2026-11-01T00:00:00Z",
      currentPeriodEnd: "2026-12-01T00:00:00Z",
      renewalAnchor: "2026-12-01T00:00:00Z",
      lockedPriceCents: 1600,
      includedKits: ["qkit", "printkit"],
      source: "admin_manual",
      founder: true,
      founderUntil: "2099-01-01T00:00:00Z",
    },
    {
      id: "sub-2",
      planSlug: "starter",
      interval: "month",
      status: "active",
      currentPeriodStart: "2020-01-01T00:00:00Z",
      currentPeriodEnd: "2020-02-01T00:00:00Z",
      renewalAnchor: "2020-02-01T00:00:00Z",
      lockedPriceCents: 900,
      includedKits: ["paykit"],
      source: "admin_manual",
      founder: false,
      founderUntil: null,
    },
  ]),
  loadVendorEventPasses: vi.fn().mockResolvedValue([
    {
      id: "pass-1",
      startsAt: "2026-12-01T00:00:00Z",
      endsAt: "2026-12-03T00:00:00Z",
      prepaidCents: 1400,
      status: "active",
    },
  ]),
  loadSyncRows: vi.fn().mockResolvedValue([
    {
      kitSlug: "qkit",
      lastStatus: "failed",
      lastHttpStatus: 404,
      lastAttemptAt: "2026-11-02T00:00:00Z",
      lastSuccessAt: null,
      tier: "qkit",
    },
  ]),
}));
vi.mock("@/lib/pricing/catalog", () => ({
  loadPlanCatalog: vi.fn().mockResolvedValue([
    {
      slug: "qkit",
      kind: "kit",
      monthlyCents: 1600,
      includedKits: ["qkit"],
      active: true,
      eventPass: null,
    },
    {
      slug: "paykit",
      kind: "kit",
      monthlyCents: 800,
      includedKits: ["paykit"],
      active: false,
      eventPass: null,
    },
    {
      slug: "event_pass",
      kind: "event_pass",
      monthlyCents: 0,
      includedKits: ["qkit"],
      active: true,
      eventPass: {
        perCupCents: 15,
        minCents: 1400,
        capCents: 2800,
        durationDays: 2,
      },
    },
  ]),
}));
vi.mock("@/lib/subscription-requests", () => ({
  getPendingRequest: getPendingRequestMock,
}));
vi.mock("@/lib/event-pass-usage-client", () => ({
  getEventPassUsage: vi.fn().mockResolvedValue({ ok: false }),
}));
vi.mock("./subscription-actions", () => ({
  settleEventPassAction: vi.fn(),
  grantSubscriptionAction: vi.fn(),
  cancelSubscriptionAction: vi.fn(),
  mintEventPassAction: vi.fn(),
  cancelEventPassAction: vi.fn(),
  repushEntitlementsAction: vi.fn(),
}));

import VendorDetailPage, { generateMetadata } from "./page";

const GRANT = {
  email: "vendor@business.sg",
  kits: [
    { slug: "qkit", name: "qkit", status: "active" as const },
    { slug: "loopkit", name: "loopkit", status: "waitlist" as const },
  ],
};

describe("VendorDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMerqoTeamMock.mockResolvedValue({ user: { id: "admin-1" } });
    getVendorGrantMock.mockResolvedValue(GRANT);
    listProductsMock.mockResolvedValue([]);
    findVendorIdMock.mockResolvedValue("vendor-1");
    countFoundersMock.mockResolvedValue(7);
    getPendingRequestMock.mockResolvedValue(null);
    listLiveProductsMock.mockResolvedValue([
      { slug: "qkit", app_url: "https://qkit.test", metrics_secret: "s1" },
      {
        slug: "loopkit",
        app_url: "https://loopkit.test",
        metrics_secret: "s2",
      },
    ]);
  });

  it("renders an activity card only for kits the vendor is active on", async () => {
    getVendorActivityMock.mockResolvedValue({
      ok: true,
      slug: "qkit",
      data: {
        active: true,
        plan: "pro",
        status: "healthy",
        metrics: [{ label: "Orders (30d)", value: "42" }],
        lastActivityAt: "2026-08-20T00:00:00.000Z",
      },
    });

    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );

    // Only the active kit (qkit) is queried — loopkit is waitlist-only.
    expect(getVendorActivityMock).toHaveBeenCalledTimes(1);
    expect(getVendorActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "qkit" }),
      "vendor@business.sg",
    );
    // "qkit" appears in the Kits list, the Activity card and the push state row (slug and tier).
    expect(screen.getAllByText("qkit")).toHaveLength(4);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
    // A kit that does not report incidents yet still renders the empty list.
    expect(
      screen.getByText("No incidents in the last 72 hours"),
    ).toBeInTheDocument();
  });

  it("renders a kit's incidents on its activity card", async () => {
    getVendorActivityMock.mockResolvedValue({
      ok: true,
      slug: "qkit",
      data: {
        active: true,
        plan: "free",
        status: "attention",
        metrics: [],
        lastActivityAt: null,
        incidents: [
          {
            kind: "webhook_rejected",
            count: 2,
            lastAt: "2026-10-28T00:00:00Z",
          },
        ],
      },
    });

    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Webhook rejected")).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
  });

  it("renders no Activity section when the vendor has no active kits", async () => {
    getVendorGrantMock.mockResolvedValue({
      email: "vendor@business.sg",
      kits: [{ slug: "qkit", name: "qkit", status: "waitlist" as const }],
    });

    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(getVendorActivityMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Activity")).not.toBeInTheDocument();
  });

  it("audits the drill-in once with a 12-char email hash, never the raw email", async () => {
    getVendorActivityMock.mockResolvedValue({ ok: false, slug: "qkit" });

    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "Vendor%40Business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    const [adminId, action, target, detail] = recordAuditMock.mock.calls[0];
    expect(adminId).toBe("admin-1");
    expect(action).toBe("view_vendor");
    expect(target).toBeNull();
    const expected = createHash("sha256")
      .update("vendor@business.sg")
      .digest("hex")
      .slice(0, 12);
    expect(detail).toEqual({ email_hash: expected });
    expect(JSON.stringify(recordAuditMock.mock.calls)).not.toMatch(/business/i);
  });

  it("calls notFound when the vendor has no grant at all", async () => {
    getVendorGrantMock.mockResolvedValue(null);

    await expect(
      VendorDetailPage({
        params: Promise.resolve({ email: "ghost@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the subscription, event pass and push state sections", async () => {
    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByText(
        "S$16.00 per month. Period 2026-11-01 to 2026-12-01. Ends 2026-12-01; renew by granting again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Lapsed")).toHaveLength(1);
    expect(
      screen.getByRole("switch", { name: /Replace current plan \(.*\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Founder until 2099-01-01/)).toBeInTheDocument();
    expect(
      screen.getByText(/Founder slots left: 13 of 20/),
    ).toBeInTheDocument();
    expect(screen.getByText("S$14.00 prepaid")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("HTTP 404")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Re-push to kits" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mint event pass" }),
    ).toBeInTheDocument();
  });

  it("offers only plans that are on sale in the grant form", async () => {
    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("combobox", { name: "Plan" })).toHaveTextContent(
      "Pro (S$16.00 a month)",
    );
    expect(screen.queryByText(/Paykit/)).not.toBeInTheDocument();
  });

  it("shows an open request and ignores a malformed request id", async () => {
    getPendingRequestMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      planSlug: "qkit",
      kind: "upgrade",
    });
    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({
          request: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
    expect(screen.getByText(/Open request: upgrade to/)).toBeInTheDocument();
    expect(getPendingRequestMock).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "vendor-1",
    );

    getPendingRequestMock.mockClear();
    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({ request: "not-a-uuid" }),
      }),
    );
    expect(getPendingRequestMock).not.toHaveBeenCalled();
  });

  it("explains a vendor with no Merqo account instead of billing controls", async () => {
    findVendorIdMock.mockResolvedValue(null);
    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText(/no Merqo account yet/)).toBeInTheDocument();
    expect(screen.queryByText("Subscriptions")).not.toBeInTheDocument();
  });

  it("renders the Admin eyebrow, email heading and description", async () => {
    render(
      await VendorDetailPage({
        params: Promise.resolve({ email: "vendor@business.sg" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "vendor@business.sg" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kits, subscriptions and activity for this vendor."),
    ).toBeInTheDocument();
  });

  it("titles the page with the decoded vendor email", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ email: "vendor%40business.sg" }),
      }),
    ).resolves.toEqual({ title: "vendor@business.sg" });
  });
});
