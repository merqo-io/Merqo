// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { listVendorGrantsMock, getTenantHealthMock } = vi.hoisted(() => ({
  listVendorGrantsMock: vi.fn(),
  getTenantHealthMock: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ listVendorGrants: listVendorGrantsMock }));
vi.mock("@/lib/tenant-health", () => ({
  getTenantHealth: getTenantHealthMock,
}));

import { TenantHealthSection } from "./tenant-health-section";

const PRODUCTS = [
  {
    slug: "qkit",
    name: "qkit",
    app_url: "https://q.test",
    metrics_url: null,
    metrics_secret: null,
    provision_secret: null,
  },
  {
    slug: "paykit",
    name: "paykit",
    app_url: "https://p.test",
    metrics_url: null,
    metrics_secret: null,
    provision_secret: null,
  },
];

describe("TenantHealthSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    render(await TenantHealthSection({ products: PRODUCTS }));

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
    render(await TenantHealthSection({ products: PRODUCTS }));
    expect(
      screen.getByText("No vendor has incidents or stuck work right now."),
    ).toBeInTheDocument();
  });
});
