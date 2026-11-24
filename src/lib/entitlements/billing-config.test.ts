import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  maybeSingle: vi.fn(),
  updateEq: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import {
  getBillingOpensAt,
  getRevenueConfig,
  setBillingOpensAt,
  setRevenueConfig,
} from "./billing-config";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockReturnValue({ eq: mocks.updateEq });
  mocks.createServiceClient.mockResolvedValue({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      update: mocks.update,
    }),
  });
});

describe("getBillingOpensAt", () => {
  it("returns the stored date", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { billing_opens_at: "2027-01-01T00:00:00Z" },
      error: null,
    });
    expect(await getBillingOpensAt()).toBe("2027-01-01T00:00:00Z");
  });

  it("returns null when there is no row", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getBillingOpensAt()).toBeNull();
  });

  it("throws on a read error", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "x" },
    });
    await expect(getBillingOpensAt()).rejects.toThrow("billing config read: x");
  });
});

describe("getRevenueConfig", () => {
  it("returns a null cap and window by default", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { revenue_cap_cents: null, revenue_window_start: null },
      error: null,
    });
    expect(await getRevenueConfig()).toEqual({
      capCents: null,
      windowStart: null,
    });
  });

  it("converts a bigint string to a number", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { revenue_cap_cents: "123456", revenue_window_start: "2026-02-01" },
      error: null,
    });
    expect(await getRevenueConfig()).toEqual({
      capCents: 123456,
      windowStart: "2026-02-01",
    });
  });

  it("treats a missing row as unset", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await getRevenueConfig()).capCents).toBeNull();
  });

  it("throws on a read error", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "x" },
    });
    await expect(getRevenueConfig()).rejects.toThrow("revenue config read: x");
  });
});

describe("setRevenueConfig", () => {
  it("writes the cap and window", async () => {
    mocks.updateEq.mockResolvedValue({ error: null });
    await setRevenueConfig({ capCents: 123456, windowStart: "2026-02-01" });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        revenue_cap_cents: 123456,
        revenue_window_start: "2026-02-01",
      }),
    );
  });

  it("throws on a write error", async () => {
    mocks.updateEq.mockResolvedValue({ error: { message: "y" } });
    await expect(
      setRevenueConfig({ capCents: null, windowStart: null }),
    ).rejects.toThrow("revenue config write: y");
  });
});

describe("setBillingOpensAt", () => {
  it("writes the date", async () => {
    mocks.updateEq.mockResolvedValue({ error: null });
    await setBillingOpensAt("2027-01-01T00:00:00Z");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ billing_opens_at: "2027-01-01T00:00:00Z" }),
    );
  });

  it("throws on a write error", async () => {
    mocks.updateEq.mockResolvedValue({ error: { message: "y" } });
    await expect(setBillingOpensAt(null)).rejects.toThrow(
      "billing config write: y",
    );
  });
});
