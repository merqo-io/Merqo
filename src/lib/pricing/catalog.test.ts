import { describe, it, expect, vi, beforeEach } from "vitest";

const { fromMock, createServiceClientMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  createServiceClientMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: createServiceClientMock,
}));

import { loadPlanCatalog, parsePlanRows } from "./catalog";

const QKIT = {
  slug: "qkit",
  kind: "kit",
  monthly_cents: 1600,
  included_kits: ["qkit", "printkit"],
  active: true,
  per_cup_cents: null,
  min_cents: null,
  cap_cents: null,
  duration_days: null,
};
const EVENT = {
  ...QKIT,
  slug: "event_pass",
  kind: "event_pass",
  monthly_cents: 0,
  per_cup_cents: 15,
  min_cents: 1400,
  cap_cents: 2800,
  duration_days: 2,
};

describe("parsePlanRows", () => {
  it("maps a kit row and leaves eventPass null", () => {
    expect(parsePlanRows([QKIT])).toEqual([
      {
        slug: "qkit",
        kind: "kit",
        monthlyCents: 1600,
        includedKits: ["qkit", "printkit"],
        active: true,
        eventPass: null,
      },
    ]);
  });

  it("maps event pass terms", () => {
    expect(parsePlanRows([EVENT])[0].eventPass).toEqual({
      perCupCents: 15,
      minCents: 1400,
      capCents: 2800,
      durationDays: 2,
    });
  });

  it("rejects a malformed row", () => {
    expect(() => parsePlanRows([{ ...QKIT, monthly_cents: "x" }])).toThrow();
  });
});

describe("loadPlanCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServiceClientMock.mockResolvedValue({ from: fromMock });
  });

  it("reads plans cheapest first", async () => {
    const order2 = vi.fn().mockResolvedValue({ data: [QKIT], error: null });
    const order1 = vi.fn(() => ({ order: order2 }));
    fromMock.mockReturnValue({ select: () => ({ order: order1 }) });
    const plans = await loadPlanCatalog();
    expect(fromMock).toHaveBeenCalledWith("plans");
    expect(order1).toHaveBeenCalledWith("monthly_cents", { ascending: true });
    expect(plans.map((p) => p.slug)).toEqual(["qkit"]);
  });

  it("throws when the read fails", async () => {
    const order2 = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    fromMock.mockReturnValue({
      select: () => ({ order: () => ({ order: order2 }) }),
    });
    await expect(loadPlanCatalog()).rejects.toThrow("plans read failed: boom");
  });
});
