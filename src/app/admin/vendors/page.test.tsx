// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const { requireMerqoTeamMock } = vi.hoisted(() => ({
  requireMerqoTeamMock: vi.fn(),
}));

vi.mock("@/lib/team", () => ({ requireMerqoTeam: requireMerqoTeamMock }));
vi.mock("@/lib/admin", () => ({
  listVendorGrants: vi.fn().mockResolvedValue([]),
  listProducts: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/entitlements/store", () => ({
  FOUNDER_CAP: 20,
  countFounders: vi.fn().mockResolvedValue(5),
}));
vi.mock("./grant-form", () => ({ GrantForm: () => null }));
vi.mock("./vendor-list", () => ({ VendorList: () => null }));

import VendorsPage, { metadata } from "./page";

describe("VendorsPage", () => {
  it("renders the shared header with founder slots left", async () => {
    requireMerqoTeamMock.mockResolvedValue(undefined);

    render(await VendorsPage());

    expect(metadata.title).toBe("Vendors");
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Vendors" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Founder slots left: 15 of 20\./),
    ).toBeInTheDocument();
  });
});
