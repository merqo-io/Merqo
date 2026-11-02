import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EntitlementPayload } from "./contract";

const mocks = vi.hoisted(() => ({
  subscriptions: vi.fn(),
  passes: vi.fn(),
  catalog: vi.fn(),
  live: vi.fn(),
  findVendorId: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock("./store", () => ({
  loadVendorSubscriptions: mocks.subscriptions,
  loadVendorEventPasses: mocks.passes,
  findVendorId: mocks.findVendorId,
}));
vi.mock("@/lib/pricing/catalog", () => ({ loadPlanCatalog: mocks.catalog }));
vi.mock("@/lib/products", () => ({ listLiveProducts: mocks.live }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import {
  mirrorDerivedPlans,
  pushKitEntitlement,
  syncVendorEntitlements,
} from "./push";

const payload: EntitlementPayload = {
  email: "v@x.com",
  kit: "qkit",
  tier: "qkit",
  founder: false,
  stats_window: "90d",
  event_pass: null,
  valid_until: "2027-01-01T00:00:00.000Z",
  issued_at: "2026-11-02T00:00:00.000Z",
};
const kit = {
  slug: "qkit",
  app_url: "https://qkit.test",
  provision_secret: "secret",
};

afterEach(() => vi.restoreAllMocks());

describe("pushKitEntitlement", () => {
  it("posts the payload with the provision secret", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const result = await pushKitEntitlement(kit, payload);
    expect(result).toEqual({ ok: true, status: 200 });
    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://qkit.test/api/merqo/entitlement");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret",
    );
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it("reports a missing route (404) without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 404 }),
    );
    expect(await pushKitEntitlement(kit, payload)).toEqual({
      ok: false,
      status: 404,
      kind: "http",
    });
  });

  it("reports a network error or timeout without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await pushKitEntitlement(kit, payload)).toEqual({
      ok: false,
      status: null,
      kind: "network",
    });
  });

  it("reports an answer that is not the agreed shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ fine: 1 })),
    );
    expect(await pushKitEntitlement(kit, payload)).toMatchObject({
      ok: false,
      kind: "schema",
    });
  });

  it("does not call a kit that has no url or secret, or a bad url", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    for (const bad of [
      { ...kit, provision_secret: null },
      { ...kit, app_url: null },
      { ...kit, app_url: "not a url" },
    ]) {
      expect(await pushKitEntitlement(bad, payload)).toEqual({
        ok: false,
        status: null,
        kind: "unconfigured",
      });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("syncVendorEntitlements", () => {
  const upsert = vi.fn();
  const linkEq2 = vi.fn();
  const update = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ error: null });
    linkEq2.mockResolvedValue({ error: null });
    update.mockReturnValue({ eq: () => ({ eq: linkEq2 }) });
    mocks.createServiceClient.mockResolvedValue({
      from: () => ({ upsert, update }),
    });
    mocks.subscriptions.mockResolvedValue([
      {
        planSlug: "qkit",
        status: "active",
        currentPeriodEnd: "2099-01-01T00:00:00Z",
        includedKits: ["qkit", "printkit"],
        founder: false,
        founderUntil: null,
      },
    ]);
    mocks.passes.mockResolvedValue([]);
    mocks.catalog.mockResolvedValue([
      {
        slug: "qkit",
        kind: "kit",
        monthlyCents: 1600,
        includedKits: ["qkit", "printkit"],
        active: true,
        eventPass: null,
      },
    ]);
    mocks.live.mockResolvedValue([
      kit,
      {
        slug: "printkit",
        app_url: "https://printkit.test",
        provision_secret: "p",
      },
      { slug: "loopkit", app_url: null, provision_secret: null },
    ]);
  });

  it("pushes the derived tier to every live kit and records each result", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) =>
      Promise.resolve(
        String(input).includes("printkit")
          ? new Response("missing", { status: 404 })
          : new Response(JSON.stringify({ ok: true })),
      ),
    );
    const outcomes = await syncVendorEntitlements(
      { id: "v1", email: "V@x.com" },
      { now: new Date("2026-11-02T00:00:00Z") },
    );

    expect(outcomes.map((o) => [o.kit, o.result.ok])).toEqual([
      ["qkit", true],
      ["printkit", false],
      ["loopkit", false],
    ]);
    const rows = upsert.mock.calls
      .map((c) => c[0])
      .sort((a, b) => a.kit_slug.localeCompare(b.kit_slug));
    expect(rows).toEqual([
      expect.objectContaining({ kit_slug: "loopkit", last_status: "skipped" }),
      expect.objectContaining({
        kit_slug: "printkit",
        last_status: "failed",
        last_http_status: 404,
      }),
      expect.objectContaining({
        kit_slug: "qkit",
        last_status: "ok",
        last_success_at: expect.any(String),
        payload: expect.objectContaining({ email: "v@x.com", tier: "qkit" }),
      }),
    ]);
    expect(rows[1]).not.toHaveProperty("last_success_at");
    // The merqo-derived tier is mirrored even when the kit did not accept it.
    expect(update).toHaveBeenCalledWith({ plan: "qkit" });
    expect(update).toHaveBeenCalledWith({ plan: "paid" });
    expect(update).toHaveBeenCalledWith({ plan: "free" });
  });

  it("pushes only the requested kits", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const outcomes = await syncVendorEntitlements(
      { id: "v1", email: "v@x.com" },
      { kits: ["printkit"] },
    );
    expect(outcomes.map((o) => o.kit)).toEqual(["printkit"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("logs and carries on when recording a push fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    upsert.mockResolvedValue({ error: { message: "db down" } });
    linkEq2.mockResolvedValue({ error: { message: "db down" } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true })),
    );
    const outcomes = await syncVendorEntitlements(
      { id: "v1", email: "v@x.com" },
      { kits: ["qkit"] },
    );
    expect(outcomes).toHaveLength(1);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("reports a push whose recording throws as failed instead of dropping it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true })),
    );
    mocks.createServiceClient.mockRejectedValue(new Error("db down"));
    const outcomes = await syncVendorEntitlements(
      { id: "v1", email: "v@x.com" },
      { kits: ["qkit", "printkit"] },
    );
    expect(outcomes.map((o) => [o.kit, o.result.ok])).toEqual([
      ["qkit", false],
      ["printkit", false],
    ]);
  });

  it("returns nothing instead of throwing when the records cannot be read", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.subscriptions.mockRejectedValue(new Error("db down"));
    expect(
      await syncVendorEntitlements({ id: "v1", email: "v@x.com" }),
    ).toEqual([]);
    expect(log).toHaveBeenCalled();
  });
});

describe("mirrorDerivedPlans", () => {
  const eq2 = vi.fn();
  const update = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    eq2.mockResolvedValue({ error: null });
    update.mockReturnValue({ eq: () => ({ eq: eq2 }) });
    mocks.createServiceClient.mockResolvedValue({ from: () => ({ update }) });
    mocks.findVendorId.mockResolvedValue("v1");
    mocks.subscriptions.mockResolvedValue([]);
    mocks.passes.mockResolvedValue([]);
    mocks.catalog.mockResolvedValue([]);
    mocks.live.mockResolvedValue([kit, { ...kit, slug: "printkit" }]);
  });

  it("writes the derived tier to every live kit's link without calling a kit", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await mirrorDerivedPlans("V@x.com");
    expect(mocks.findVendorId).toHaveBeenCalledWith("v@x.com");
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith({ plan: "free" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("leaves a vendor with no Merqo account alone", async () => {
    mocks.findVendorId.mockResolvedValue(null);
    await mirrorDerivedPlans("v@x.com");
    expect(update).not.toHaveBeenCalled();
  });

  it("logs instead of throwing when the lookup fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findVendorId.mockRejectedValue(new Error("db down"));
    await expect(mirrorDerivedPlans("v@x.com")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});
