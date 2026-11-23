// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  getBillingOpensAt: vi.fn(),
  countFounders: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/entitlements/billing-config", () => ({
  getBillingOpensAt: mocks.getBillingOpensAt,
}));
vi.mock("@/lib/entitlements/store", () => ({
  FOUNDER_CAP: 20,
  countFounders: mocks.countFounders,
}));
vi.mock("./billing-form", () => ({
  BillingOpenForm: ({ current }: { current: string | null }) => (
    <span data-testid="form">{current ?? "none"}</span>
  ),
}));

import BillingPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "a" } });
});

describe("BillingPage", () => {
  it("shows an open offer with no date set", async () => {
    mocks.getBillingOpensAt.mockResolvedValue(null);
    mocks.countFounders.mockResolvedValue(5);
    render(await BillingPage());
    expect(
      screen.getByRole("heading", { level: 1, name: "Billing" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("15 of 20")).toBeInTheDocument();
    expect(screen.getByText("No open date set")).toBeInTheDocument();
    expect(
      screen.getByText("S$199.00 prepaid for 12 months"),
    ).toBeInTheDocument();
  });

  it("shows the derived close date", async () => {
    mocks.getBillingOpensAt.mockResolvedValue(
      new Date(Date.now() + 10 * 86_400_000).toISOString(),
    );
    mocks.countFounders.mockResolvedValue(0);
    render(await BillingPage());
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.queryByText("No open date set")).not.toBeInTheDocument();
  });

  it("is closed when the close date has passed", async () => {
    mocks.getBillingOpensAt.mockResolvedValue("2020-01-01T00:00:00.000Z");
    mocks.countFounders.mockResolvedValue(3);
    render(await BillingPage());
    expect(
      screen.getByText("Closed: the close date has passed"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 of 20")).toBeInTheDocument();
  });

  it("is closed when all spots are taken", async () => {
    mocks.getBillingOpensAt.mockResolvedValue(null);
    mocks.countFounders.mockResolvedValue(20);
    render(await BillingPage());
    expect(
      screen.getByText("Closed: all 20 spots are taken"),
    ).toBeInTheDocument();
  });
});
