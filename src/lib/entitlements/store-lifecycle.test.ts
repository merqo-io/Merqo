import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import {
  PauseError,
  endPause,
  pauseSubscription,
  setScheduledPlan,
  upgradeSubscription,
} from "./store";

type Result = {
  data?: unknown;
  error?: { message: string } | null;
};

function chain(result: Result) {
  const resolved = { data: null, error: null, ...result };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "insert", "update", "single"]) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (v: unknown) => unknown) => resolve(resolved);
  return q as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<unknown>;
}

const plan = {
  slug: "qkit",
  kind: "kit" as const,
  monthlyCents: 1990,
  includedKits: ["qkit"],
  active: true,
  eventPass: null,
};

const from = {
  id: "s1",
  planSlug: "starter",
  interval: "month" as const,
  status: "active",
  currentPeriodStart: "2026-11-01T00:00:00Z",
  currentPeriodEnd: "2026-12-01T00:00:00Z",
  renewalAnchor: "2026-11-01T00:00:00Z",
  lockedPriceCents: 1490,
  includedKits: ["qkit"],
  source: "admin_manual",
  founder: false,
  founderUntil: null,
};

const pauseInput = {
  subscriptionId: "s1",
  startsOn: "2026-11-10",
  endsOn: "2026-11-20",
  reason: "away",
  createdBy: "admin",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createServiceClient.mockResolvedValue({
    from: mocks.from,
    rpc: mocks.rpc,
  });
});

describe("upgradeSubscription", () => {
  it("inserts the new plan on the same period, then closes the old row", async () => {
    const write = chain({ data: { id: "new" } });
    mocks.from
      .mockReturnValueOnce(write)
      .mockReturnValueOnce(chain({ data: [{ id: "s1" }] }));
    const id = await upgradeSubscription({
      vendorId: "v1",
      from,
      plan,
      priceCents: 1990,
    });
    expect(id).toBe("new");
    expect(write.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_slug: "qkit",
        current_period_end: from.currentPeriodEnd,
        renewal_anchor: from.renewalAnchor,
        locked_price_cents: 1990,
      }),
    );
  });

  it("fails when the insert fails or the old row was already closed", async () => {
    mocks.from.mockReturnValueOnce(chain({ error: { message: "boom" } }));
    await expect(
      upgradeSubscription({ vendorId: "v1", from, plan, priceCents: 1 }),
    ).rejects.toThrow("upgrade subscription: boom");
    mocks.from
      .mockReturnValueOnce(chain({ data: { id: "new" } }))
      .mockReturnValueOnce(chain({ data: [] }));
    await expect(
      upgradeSubscription({ vendorId: "v1", from, plan, priceCents: 1 }),
    ).rejects.toThrow("already closed");
  });
});

describe("setScheduledPlan", () => {
  it("sets and clears the scheduled plan", async () => {
    const q = chain({ data: [{ id: "s1" }] });
    mocks.from.mockReturnValue(q);
    expect(await setScheduledPlan("v1", "s1", "starter")).toBe(true);
    expect(q.update).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_plan_slug: "starter" }),
    );
    mocks.from.mockReturnValue(chain({ data: [] }));
    expect(await setScheduledPlan("v1", "s1", null)).toBe(false);
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(setScheduledPlan("v1", "s1", null)).rejects.toThrow(
      "schedule plan",
    );
  });
});

describe("pauseSubscription and endPause", () => {
  it("pauses through the rpc", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "p1", error: null });
    expect(await pauseSubscription(pauseInput)).toBe("p1");
    expect(mocks.rpc).toHaveBeenCalledWith("pause_subscription", {
      p_subscription_id: "s1",
      p_starts_on: "2026-11-10",
      p_ends_on: "2026-11-20",
      p_reason: "away",
      p_created_by: "admin",
    });
  });

  it("maps known database failures to a PauseError kind", async () => {
    for (const [message, kind] of [
      ["pause cap of 92 days in 365 reached", "cap"],
      ["pause overlaps an existing pause", "overlap"],
      ["pause cannot start in the past", "past"],
      ["subscription is not active", "inactive"],
    ] as const) {
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { message } });
      await expect(pauseSubscription(pauseInput)).rejects.toMatchObject({
        kind,
      });
    }
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(pauseSubscription(pauseInput)).rejects.toThrow(
      "pause subscription: boom",
    );
  });

  it("ends a pause and maps the already-ended failure", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: null });
    await endPause("p1", "2026-11-12");
    expect(mocks.rpc).toHaveBeenCalledWith("end_pause", {
      p_pause_id: "p1",
      p_today: "2026-11-12",
    });
    mocks.rpc.mockResolvedValueOnce({
      error: { message: "pause already ended" },
    });
    await expect(endPause("p1", "2026-11-12")).rejects.toBeInstanceOf(
      PauseError,
    );
  });
});
