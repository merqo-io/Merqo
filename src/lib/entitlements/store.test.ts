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
  FounderCapError,
  cancelEventPass,
  cancelSubscription,
  countFounders,
  findVendorId,
  grantSubscription,
  loadSyncRows,
  loadVendorEventPasses,
  loadVendorSubscriptions,
  mintEventPass,
} from "./store";

type Result = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
};

/** A chainable query stub: every builder method returns itself, and awaiting
 *  it (or `.single()`/`.maybeSingle()`) yields `result`. */
function chain(result: Result) {
  const resolved = { data: null, error: null, ...result };
  const q: Record<string, unknown> = {};
  for (const m of [
    "select",
    "eq",
    "order",
    "insert",
    "update",
    "single",
    "maybeSingle",
  ]) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (v: unknown) => unknown) => resolve(resolved);
  return q as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<unknown>;
}

const plan = {
  slug: "qkit",
  kind: "kit" as const,
  monthlyCents: 1600,
  includedKits: ["qkit", "printkit"],
  active: true,
  eventPass: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createServiceClient.mockResolvedValue({
    from: mocks.from,
    rpc: mocks.rpc,
  });
});

describe("reads", () => {
  it("finds a vendor id by email", async () => {
    mocks.rpc.mockResolvedValue({ data: "v1", error: null });
    expect(await findVendorId("a@x.com")).toBe("v1");
    expect(mocks.rpc).toHaveBeenCalledWith("user_id_for_email", {
      p_email: "a@x.com",
    });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect(await findVendorId("b@x.com")).toBeNull();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(findVendorId("c@x.com")).rejects.toThrow("vendor lookup");
  });

  it("maps subscription rows", async () => {
    mocks.from.mockReturnValue(
      chain({
        data: [
          {
            id: "s1",
            plan_slug: "qkit",
            interval: "month",
            status: "active",
            current_period_start: "a",
            current_period_end: "b",
            renewal_anchor: "c",
            locked_price_cents: 1600,
            included_kits: ["qkit"],
            source: "admin_manual",
            founder: true,
            founder_until: "d",
          },
        ],
      }),
    );
    expect(await loadVendorSubscriptions("v1")).toEqual([
      {
        id: "s1",
        planSlug: "qkit",
        interval: "month",
        status: "active",
        currentPeriodStart: "a",
        currentPeriodEnd: "b",
        renewalAnchor: "c",
        lockedPriceCents: 1600,
        includedKits: ["qkit"],
        source: "admin_manual",
        founder: true,
        founderUntil: "d",
      },
    ]);
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(loadVendorSubscriptions("v1")).rejects.toThrow(
      "subscriptions read",
    );
  });

  it("maps event pass rows and sync rows", async () => {
    mocks.from.mockReturnValue(
      chain({
        data: [
          {
            id: "p1",
            starts_at: "a",
            ends_at: "b",
            prepaid_cents: 1400,
            status: "active",
          },
        ],
      }),
    );
    expect(await loadVendorEventPasses("v1")).toEqual([
      {
        id: "p1",
        startsAt: "a",
        endsAt: "b",
        prepaidCents: 1400,
        status: "active",
      },
    ]);

    mocks.from.mockReturnValue(
      chain({
        data: [
          {
            kit_slug: "qkit",
            payload: { tier: "qkit" },
            last_status: "ok",
            last_http_status: 200,
            last_error_kind: "schema",
            last_attempt_at: "a",
            last_success_at: "a",
          },
          {
            kit_slug: "loopkit",
            payload: null,
            last_status: "skipped",
            last_http_status: null,
            last_attempt_at: "a",
            last_success_at: null,
          },
        ],
      }),
    );
    const rows = await loadSyncRows("v1");
    expect(rows[0]).toMatchObject({
      kitSlug: "qkit",
      tier: "qkit",
      lastStatus: "ok",
      lastErrorKind: "schema",
    });
    expect(rows[1]).toMatchObject({ kitSlug: "loopkit", tier: null });

    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(loadVendorEventPasses("v1")).rejects.toThrow(
      "event passes read",
    );
    await expect(loadSyncRows("v1")).rejects.toThrow("entitlement sync read");
  });

  it("counts distinct founder vendors", async () => {
    mocks.from.mockReturnValue(
      chain({
        data: [{ vendor_id: "a" }, { vendor_id: "a" }, { vendor_id: "b" }],
      }),
    );
    expect(await countFounders()).toBe(2);
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(countFounders()).rejects.toThrow("founder count");
  });
});

describe("grantSubscription", () => {
  const input = {
    vendorId: "v1",
    plan,
    interval: "year" as const,
    priceCents: 16000,
    periodStart: new Date("2026-11-02T00:00:00Z"),
    renewalAnchor: new Date("2027-11-02T00:00:00Z"),
    founder: true,
  };

  it("inserts a new subscription with the plan's kits and a founder window", async () => {
    const lookup = chain({ data: null });
    const write = chain({ data: { id: "new" } });
    mocks.from.mockReturnValueOnce(lookup).mockReturnValueOnce(write);

    expect(await grantSubscription(input)).toBe("new");
    expect(write.insert).toHaveBeenCalledWith({
      vendor_id: "v1",
      plan_slug: "qkit",
      interval: "year",
      current_period_start: "2026-11-02T00:00:00.000Z",
      current_period_end: "2027-11-02T00:00:00.000Z",
      renewal_anchor: "2027-11-02T00:00:00.000Z",
      locked_price_cents: 16000,
      included_kits: ["qkit", "printkit"],
      founder: true,
      founder_until: "2027-11-02T00:00:00.000Z",
    });
  });

  it("updates the active subscription in place and leaves founder alone when not set", async () => {
    const lookup = chain({ data: { id: "existing" } });
    const write = chain({ data: { id: "existing" } });
    mocks.from.mockReturnValueOnce(lookup).mockReturnValueOnce(write);

    expect(await grantSubscription({ ...input, founder: false })).toBe(
      "existing",
    );
    const [fields] = write.update.mock.calls[0] as [Record<string, unknown>];
    expect(fields).not.toHaveProperty("founder");
    expect(fields).toMatchObject({
      locked_price_cents: 16000,
      interval: "year",
    });
    expect(write.eq).toHaveBeenCalledWith("id", "existing");
  });

  it("turns the founder cap trigger into FounderCapError", async () => {
    mocks.from.mockReturnValueOnce(chain({ data: null })).mockReturnValueOnce(
      chain({
        error: { code: "23514", message: "founder cap of 20 reached" },
      }),
    );
    await expect(grantSubscription(input)).rejects.toBeInstanceOf(
      FounderCapError,
    );
  });

  it("throws other write and read errors", async () => {
    mocks.from
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(
        chain({ error: { code: "23514", message: "other check" } }),
      );
    await expect(grantSubscription(input)).rejects.toThrow(
      "grant subscription",
    );

    mocks.from.mockReturnValueOnce(chain({ error: { message: "boom" } }));
    await expect(grantSubscription(input)).rejects.toThrow("subscription read");
  });
});

describe("cancel and mint", () => {
  it("cancels a subscription only when a row changed", async () => {
    const q = chain({ data: [{ id: "s1" }] });
    mocks.from.mockReturnValue(q);
    expect(await cancelSubscription("v1", "s1")).toBe(true);
    expect(q.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "canceled" }),
    );
    mocks.from.mockReturnValue(chain({ data: [] }));
    expect(await cancelSubscription("v1", "s1")).toBe(false);
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(cancelSubscription("v1", "s1")).rejects.toThrow(
      "cancel subscription",
    );
  });

  it("mints an event pass", async () => {
    const q = chain({ data: { id: "p1" } });
    mocks.from.mockReturnValue(q);
    const id = await mintEventPass({
      vendorId: "v1",
      startsAt: new Date("2026-12-01T00:00:00Z"),
      endsAt: new Date("2026-12-03T00:00:00Z"),
      prepaidCents: 1400,
      createdBy: "admin",
    });
    expect(id).toBe("p1");
    expect(q.insert).toHaveBeenCalledWith({
      vendor_id: "v1",
      starts_at: "2026-12-01T00:00:00.000Z",
      ends_at: "2026-12-03T00:00:00.000Z",
      prepaid_cents: 1400,
      created_by: "admin",
    });
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(
      mintEventPass({
        vendorId: "v1",
        startsAt: new Date(),
        endsAt: new Date(),
        prepaidCents: 0,
        createdBy: "admin",
      }),
    ).rejects.toThrow("mint event pass");
  });

  it("cancels an event pass only when a row changed", async () => {
    mocks.from.mockReturnValue(chain({ data: [{ id: "p1" }] }));
    expect(await cancelEventPass("v1", "p1")).toBe(true);
    mocks.from.mockReturnValue(chain({ data: [] }));
    expect(await cancelEventPass("v1", "p1")).toBe(false);
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(cancelEventPass("v1", "p1")).rejects.toThrow(
      "cancel event pass",
    );
  });
});
