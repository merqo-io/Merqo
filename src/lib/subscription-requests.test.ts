import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "@/lib/pricing/catalog";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({ from: mocks.from }),
}));

import {
  closeRequest,
  createSubscriptionRequest,
  getPendingRequest,
  listPendingRequests,
  upgradePlanForKit,
} from "./subscription-requests";

type Result = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
};

function chain(result: Result) {
  const resolved = { data: null, error: null, ...result };
  const q: Record<string, unknown> = {};
  for (const m of [
    "select",
    "eq",
    "order",
    "insert",
    "update",
    "maybeSingle",
  ]) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (v: unknown) => unknown) => resolve(resolved);
  return q as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<unknown>;
}

function plan(
  slug: string,
  kind: Plan["kind"],
  includedKits: string[],
  extra: Partial<Plan> = {},
): Plan {
  return {
    slug,
    kind,
    monthlyCents: 0,
    includedKits,
    active: true,
    eventPass: null,
    ...extra,
  };
}

const row = {
  id: "r1",
  vendor_id: "v1",
  plan_slug: "qkit",
  interval: "month",
  kind: "upgrade",
  status: "pending",
  note: null,
  created_at: "2026-11-02T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("upgradePlanForKit", () => {
  const catalog = [
    plan("free", "free", ["qkit"]),
    plan("starter", "starter", ["qkit"], { monthlyCents: 1200 }),
    plan("qkit", "kit", ["qkit", "printkit"], { monthlyCents: 1600 }),
    plan("paykit", "kit", ["paykit"], { monthlyCents: 800, active: false }),
    plan("all_access", "bundle", ["qkit", "paykit"], { monthlyCents: 3600 }),
    plan("event_pass", "event_pass", ["qkit"]),
  ];

  it("picks the cheapest sellable plan that includes the kit", () => {
    expect(upgradePlanForKit(catalog, "qkit")?.slug).toBe("starter");
    expect(upgradePlanForKit(catalog, "printkit")?.slug).toBe("qkit");
  });

  it("skips inactive plans and returns null when nothing is on sale", () => {
    expect(upgradePlanForKit(catalog, "paykit")?.slug).toBe("all_access");
    expect(upgradePlanForKit(catalog, "ghost")).toBeNull();
  });
});

describe("requests store", () => {
  it("files a request and reports a duplicate pending one", async () => {
    const q = chain({});
    mocks.from.mockReturnValue(q);
    expect(
      await createSubscriptionRequest({
        vendorId: "v1",
        planSlug: "qkit",
        kind: "upgrade",
        note: "n",
      }),
    ).toEqual({ created: true });
    expect(q.insert).toHaveBeenCalledWith({
      vendor_id: "v1",
      plan_slug: "qkit",
      kind: "upgrade",
      note: "n",
    });

    mocks.from.mockReturnValue(
      chain({ error: { code: "23505", message: "dup" } }),
    );
    expect(
      await createSubscriptionRequest({
        vendorId: "v1",
        planSlug: "qkit",
        kind: "upgrade",
        note: "n",
      }),
    ).toEqual({ created: false });

    mocks.from.mockReturnValue(
      chain({ error: { code: "XX", message: "boom" } }),
    );
    await expect(
      createSubscriptionRequest({
        vendorId: "v1",
        planSlug: "qkit",
        kind: "upgrade",
        note: "n",
      }),
    ).rejects.toThrow("create subscription request");
  });

  it("lists pending requests oldest first", async () => {
    const q = chain({ data: [row] });
    mocks.from.mockReturnValue(q);
    expect(await listPendingRequests()).toEqual([
      {
        id: "r1",
        vendorId: "v1",
        planSlug: "qkit",
        interval: "month",
        kind: "upgrade",
        status: "pending",
        note: null,
        createdAt: "2026-11-02T00:00:00Z",
      },
    ]);
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: true });
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(listPendingRequests()).rejects.toThrow("requests read");
  });

  it("reads one pending request scoped to the vendor", async () => {
    const q = chain({ data: row });
    mocks.from.mockReturnValue(q);
    expect((await getPendingRequest("r1", "v1"))?.id).toBe("r1");
    expect(q.eq).toHaveBeenCalledWith("vendor_id", "v1");
    mocks.from.mockReturnValue(chain({ data: null }));
    expect(await getPendingRequest("r1", "v1")).toBeNull();
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(getPendingRequest("r1", "v1")).rejects.toThrow("request read");
  });

  it("closes a request only while it is pending", async () => {
    const q = chain({ data: [{ id: "r1" }] });
    mocks.from.mockReturnValue(q);
    expect(await closeRequest("r1", "declined", "admin")).toBe(true);
    expect(q.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "declined", resolved_by: "admin" }),
    );
    expect(q.eq).toHaveBeenCalledWith("status", "pending");
    mocks.from.mockReturnValue(chain({ data: [] }));
    expect(await closeRequest("r1", "resolved", "admin")).toBe(false);
    mocks.from.mockReturnValue(chain({ error: { message: "boom" } }));
    await expect(closeRequest("r1", "resolved", "admin")).rejects.toThrow(
      "close request",
    );
  });
});
