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
} = vi.hoisted(() => ({
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

import VendorDetailPage from "./page";

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
      }),
    );

    // Only the active kit (qkit) is queried — loopkit is waitlist-only.
    expect(getVendorActivityMock).toHaveBeenCalledTimes(1);
    expect(getVendorActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "qkit" }),
      "vendor@business.sg",
    );
    // "qkit" appears twice — once in the Kits list, once on the Activity card.
    expect(screen.getAllByText("qkit")).toHaveLength(2);
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
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
