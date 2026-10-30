// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  requireMerqoTeamMock,
  listLiveProductsMock,
  listVendorGrantsMock,
  getTenantHealthMock,
} = vi.hoisted(() => ({
  requireMerqoTeamMock: vi.fn(),
  listLiveProductsMock: vi.fn(),
  listVendorGrantsMock: vi.fn(),
  getTenantHealthMock: vi.fn(),
}));

vi.mock("@/lib/team", () => ({ requireMerqoTeam: requireMerqoTeamMock }));
vi.mock("@/lib/products", () => ({ listLiveProducts: listLiveProductsMock }));
vi.mock("@/lib/admin", () => ({ listVendorGrants: listVendorGrantsMock }));
vi.mock("@/lib/tenant-health", () => ({
  getTenantHealth: getTenantHealthMock,
}));

import AdminHealthPage from "./page";

const PRODUCTS = [
  { slug: "qkit", name: "qkit", app_url: "https://q.test" },
  { slug: "paykit", name: "paykit", app_url: "https://p.test" },
];

describe("AdminHealthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMerqoTeamMock.mockResolvedValue({ user: { id: "u1" } });
    listLiveProductsMock.mockResolvedValue(PRODUCTS);
    listVendorGrantsMock.mockResolvedValue([
      {
        email: "a@x.sg",
        kits: [
          { slug: "qkit", name: "qkit", status: "active" },
          { slug: "paykit", name: "paykit", status: "active" },
        ],
      },
      {
        email: "w@x.sg",
        kits: [{ slug: "qkit", name: "qkit", status: "waitlist" }],
      },
    ]);
  });

  it("passes only active kits to getTenantHealth and renders rows", async () => {
    getTenantHealthMock.mockResolvedValue([
      {
        email: "a@x.sg",
        worst: "attention",
        perKit: [
          {
            slug: "qkit",
            status: null,
            incidentCount: 0,
            lastAt: null,
            ok: false,
          },
          {
            slug: "paykit",
            status: "healthy",
            incidentCount: 4,
            lastAt: "2026-10-28T00:00:00Z",
            ok: true,
          },
        ],
      },
    ]);

    render(await AdminHealthPage());

    expect(getTenantHealthMock).toHaveBeenCalledWith(PRODUCTS, [
      { email: "a@x.sg", kits: ["qkit", "paykit"] },
    ]);
    const link = screen.getByRole("link", { name: "a@x.sg" });
    expect(link).toHaveAttribute("href", "/admin/vendors/a%40x.sg");

    const row = link.closest("tr");
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement);
    expect(cells.getByText("No data")).toBeInTheDocument();
    expect(cells.getByText("4 incidents")).toBeInTheDocument();
  });

  it("renders an empty state when no vendor needs attention", async () => {
    getTenantHealthMock.mockResolvedValue([]);
    render(await AdminHealthPage());
    expect(
      screen.getByText("No vendor has incidents or stuck work right now."),
    ).toBeInTheDocument();
  });
});
