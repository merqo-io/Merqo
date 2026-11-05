// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const { requireMerqoTeamMock, listLiveProductsMock } = vi.hoisted(() => ({
  requireMerqoTeamMock: vi.fn(),
  listLiveProductsMock: vi.fn(),
}));

vi.mock("@/lib/team", () => ({ requireMerqoTeam: requireMerqoTeamMock }));
vi.mock("@/lib/products", () => ({ listLiveProducts: listLiveProductsMock }));
vi.mock("@/lib/metrics-client", () => ({ fetchProductMetrics: vi.fn() }));
vi.mock("./product-health-card", () => ({ ProductHealthCard: () => null }));
vi.mock("./tenant-health-section", () => ({ TenantHealthSection: () => null }));

import AdminProductsPage, { metadata } from "./page";

describe("AdminProductsPage", () => {
  it("renders the shared header and an empty state", async () => {
    requireMerqoTeamMock.mockResolvedValue(undefined);
    listLiveProductsMock.mockResolvedValue([]);

    render(await AdminProductsPage());

    expect(metadata.title).toBe("Products");
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Products" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No live products yet. Kits show up here once they go live.",
      ),
    ).toBeInTheDocument();
  });
});
