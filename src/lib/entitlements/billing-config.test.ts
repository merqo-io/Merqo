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

import { getBillingOpensAt, setBillingOpensAt } from "./billing-config";

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
