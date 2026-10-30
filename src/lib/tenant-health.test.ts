import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RegistryRow } from "@/lib/products";

const { getVendorActivityMock } = vi.hoisted(() => ({
  getVendorActivityMock: vi.fn(),
}));

vi.mock("@/lib/vendor-activity-client", () => ({
  getVendorActivity: getVendorActivityMock,
}));

import { getTenantHealth } from "./tenant-health";

function product(slug: string): RegistryRow {
  return {
    slug,
    name: slug,
    app_url: `https://${slug}.test`,
    metrics_url: null,
    metrics_secret: "s",
    provision_secret: null,
  };
}

const PRODUCTS = [product("qkit"), product("paykit")];

function payload(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    plan: "free",
    status: "healthy",
    metrics: [],
    lastActivityAt: null,
    ...overrides,
  };
}

type Responses = Record<string, Record<string, unknown> | "timeout">;

function respond(byEmail: Record<string, Responses>) {
  getVendorActivityMock.mockImplementation(
    async (kit: { slug: string }, email: string) => {
      const r = byEmail[email]?.[kit.slug];
      if (!r || r === "timeout") return { ok: false, slug: kit.slug };
      return { ok: true, slug: kit.slug, data: r };
    },
  );
}

describe("getTenantHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps a row when one kit times out, taking worst from the other kit", async () => {
    respond({
      "a@x.sg": {
        qkit: "timeout",
        paykit: payload({
          incidents: [
            {
              kind: "payment_callback_failed",
              count: 2,
              lastAt: "2026-10-28T00:00:00Z",
            },
          ],
        }),
      },
    });

    const rows = await getTenantHealth(PRODUCTS, [
      { email: "a@x.sg", kits: ["qkit", "paykit"] },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].worst).toBe("attention");
    expect(rows[0].perKit).toEqual([
      { slug: "qkit", status: null, incidentCount: 0, lastAt: null, ok: false },
      {
        slug: "paykit",
        status: "healthy",
        incidentCount: 2,
        lastAt: "2026-10-28T00:00:00Z",
        ok: true,
      },
    ]);
  });

  it("passes the timeout through to each kit call", async () => {
    respond({});
    await getTenantHealth(PRODUCTS, [{ email: "a@x.sg", kits: ["qkit"] }], {
      timeoutMs: 1234,
    });
    expect(getVendorActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "qkit" }),
      "a@x.sg",
      { timeoutMs: 1234 },
    );
  });

  it("excludes vendors with no incidents and a healthy status", async () => {
    respond({
      "fine@x.sg": { qkit: payload(), paykit: payload({ incidents: [] }) },
      "stuck@x.sg": { qkit: payload({ status: "stuck" }) },
    });

    const rows = await getTenantHealth(PRODUCTS, [
      { email: "fine@x.sg", kits: ["qkit", "paykit"] },
      { email: "stuck@x.sg", kits: ["qkit"] },
    ]);

    expect(rows.map((r) => r.email)).toEqual(["stuck@x.sg"]);
  });

  it("reports unknown when no kit answered", async () => {
    respond({});
    const rows = await getTenantHealth(PRODUCTS, [
      { email: "dark@x.sg", kits: ["qkit"] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].worst).toBe("unknown");
  });

  it("skips kits missing from the registry", async () => {
    respond({});
    const rows = await getTenantHealth(PRODUCTS, [
      { email: "a@x.sg", kits: ["stockkit"] },
    ]);
    expect(getVendorActivityMock).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });

  it("sorts attention first, then most incidents", async () => {
    const incidents = (count: number) => [
      { kind: "print_failed", count, lastAt: "2026-10-28T00:00:00Z" },
    ];
    respond({
      "unknown@x.sg": {},
      "few@x.sg": { qkit: payload({ incidents: incidents(1) }) },
      "many@x.sg": { qkit: payload({ incidents: incidents(5) }) },
      "attn@x.sg": { qkit: payload({ status: "attention" }) },
    });

    const rows = await getTenantHealth(PRODUCTS, [
      { email: "unknown@x.sg", kits: ["qkit"] },
      { email: "few@x.sg", kits: ["qkit"] },
      { email: "attn@x.sg", kits: ["qkit"] },
      { email: "many@x.sg", kits: ["qkit"] },
    ]);

    expect(rows.map((r) => r.email)).toEqual([
      "many@x.sg",
      "few@x.sg",
      "attn@x.sg",
      "unknown@x.sg",
    ]);
  });

  it("never runs more kit calls at once than the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    getVendorActivityMock.mockImplementation(async (kit: { slug: string }) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return { ok: false, slug: kit.slug };
    });

    const vendors = Array.from({ length: 10 }, (_, i) => ({
      email: `v${i}@x.sg`,
      kits: ["qkit", "paykit"],
    }));
    await getTenantHealth(PRODUCTS, vendors, { concurrency: 3 });

    expect(getVendorActivityMock).toHaveBeenCalledTimes(20);
    expect(peak).toBe(3);
  });
});
