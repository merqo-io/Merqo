// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  getBillingOpensAt: vi.fn(),
  countFounders: vi.fn(),
  getRevenueConfig: vi.fn(),
  revenueTotalSince: vi.fn(),
  listRecentPayments: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/entitlements/billing-config", () => ({
  getBillingOpensAt: mocks.getBillingOpensAt,
  getRevenueConfig: mocks.getRevenueConfig,
}));
vi.mock("@/lib/entitlements/ledger", () => ({
  revenueTotalSince: mocks.revenueTotalSince,
  listRecentPayments: mocks.listRecentPayments,
}));
vi.mock("./revenue-form", () => ({ RevenueCapForm: () => null }));
vi.mock("./payment-form", () => ({ PaymentForm: () => null }));
vi.mock("./payment-list", () => ({
  PaymentList: ({ payments }: { payments: unknown[] }) => (
    <span data-testid="payments">{payments.length}</span>
  ),
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
  mocks.getRevenueConfig.mockResolvedValue({
    capCents: null,
    windowStart: null,
  });
  mocks.revenueTotalSince.mockResolvedValue(0);
  mocks.listRecentPayments.mockResolvedValue([]);
});

describe("BillingPage revenue", () => {
  beforeEach(() => {
    mocks.getBillingOpensAt.mockResolvedValue(null);
    mocks.countFounders.mockResolvedValue(0);
  });

  it("shows the total and no cap when none is set", async () => {
    mocks.revenueTotalSince.mockResolvedValue(123456);
    render(await BillingPage());
    expect(screen.getByText("S$1234.56")).toBeInTheDocument();
    expect(screen.getByText("No cap set")).toBeInTheDocument();
    expect(screen.queryByText("Remaining")).not.toBeInTheDocument();
  });

  it("shows percent used, remaining and the status against a cap", async () => {
    mocks.getRevenueConfig.mockResolvedValue({
      capCents: 200000,
      windowStart: "2026-02-01",
    });
    mocks.revenueTotalSince.mockResolvedValue(160000);
    mocks.listRecentPayments.mockResolvedValue([{ id: "p" }]);
    render(await BillingPage());
    expect(screen.getByText("Near cap")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("S$400.00")).toBeInTheDocument();
    expect(screen.getByText("Received since 2026-02-01")).toBeInTheDocument();
    expect(screen.getByTestId("payments")).toHaveTextContent("1");
  });
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
