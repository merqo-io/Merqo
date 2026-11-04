// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  requireMerqoTeamMock,
  listLiveProductsMock,
  listVendorGrantsMock,
  listOpenSupportMessagesMock,
  fetchProductMetricsMock,
  getTenantHealthMock,
} = vi.hoisted(() => ({
  requireMerqoTeamMock: vi.fn(),
  listLiveProductsMock: vi.fn(),
  listVendorGrantsMock: vi.fn(),
  listOpenSupportMessagesMock: vi.fn(),
  fetchProductMetricsMock: vi.fn(),
  getTenantHealthMock: vi.fn(),
}));

vi.mock("@/lib/team", () => ({ requireMerqoTeam: requireMerqoTeamMock }));
vi.mock("@/lib/products", () => ({ listLiveProducts: listLiveProductsMock }));
vi.mock("@/lib/admin", () => ({ listVendorGrants: listVendorGrantsMock }));
vi.mock("@/lib/support", () => ({
  listOpenSupportMessages: listOpenSupportMessagesMock,
}));
vi.mock("@/lib/metrics-client", () => ({
  fetchProductMetrics: fetchProductMetricsMock,
}));
vi.mock("@/lib/tenant-health", () => ({
  getTenantHealth: getTenantHealthMock,
}));
vi.mock("./support-message-row", () => ({ SupportMessageRow: () => null }));

import AdminOverviewPage, { metadata } from "./page";

const PRODUCT = { slug: "qkit", name: "qkit", app_url: "https://q.test" };

function healthRow(email: string, worst: "attention" | "unknown") {
  return { email, worst, perKit: [] };
}

describe("AdminOverviewPage needs-attention health count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMerqoTeamMock.mockResolvedValue({ user: { id: "u1" } });
    listLiveProductsMock.mockResolvedValue([PRODUCT]);
    listVendorGrantsMock.mockResolvedValue([
      {
        email: "a@x.sg",
        kits: [{ slug: "qkit", name: "qkit", status: "active" }],
      },
      {
        email: "w@x.sg",
        kits: [{ slug: "qkit", name: "qkit", status: "waitlist" }],
      },
    ]);
    listOpenSupportMessagesMock.mockResolvedValue([]);
    fetchProductMetricsMock.mockResolvedValue({ ok: false, reason: "down" });
  });

  it("counts vendors needing attention and links to /admin/products", async () => {
    getTenantHealthMock.mockResolvedValue([
      healthRow("a@x.sg", "attention"),
      healthRow("b@x.sg", "attention"),
      healthRow("c@x.sg", "unknown"),
    ]);

    render(await AdminOverviewPage());

    expect(getTenantHealthMock).toHaveBeenCalledWith(
      [PRODUCT],
      [{ email: "a@x.sg", kits: ["qkit"] }],
    );
    expect(
      screen.getByText(/2 vendors with\s+incidents or stuck work/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View health" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
    // 1 waitlisted vendor + 2 flagged vendors
    expect(screen.getByText("Needs attention · 3")).toBeInTheDocument();
  });

  it("shows no health row when no vendor is flagged", async () => {
    getTenantHealthMock.mockResolvedValue([healthRow("c@x.sg", "unknown")]);

    render(await AdminOverviewPage());

    expect(
      screen.queryByRole("link", { name: "View health" }),
    ).not.toBeInTheDocument();
  });

  it("renders the unified header and an empty products state", async () => {
    listLiveProductsMock.mockResolvedValue([]);
    getTenantHealthMock.mockResolvedValue([]);

    render(await AdminOverviewPage());

    expect(
      screen.getByRole("heading", { name: "Overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("How every kit and vendor is doing right now."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No products yet. Kits show up here once they are added.",
      ),
    ).toBeInTheDocument();
    expect(metadata.title).toBe("Overview");
  });
});
