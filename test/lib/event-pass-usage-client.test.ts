import { describe, it, expect, vi, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({ listLiveProducts: vi.fn() }));
vi.mock("@/lib/products", () => ({ listLiveProducts: mocks.listLiveProducts }));

import {
  fetchEventPassUsage,
  getEventPassUsage,
} from "@/lib/event-pass-usage-client";

const kit = {
  slug: "qkit",
  app_url: "https://qkit.vercel.app",
  metrics_secret: "s",
};
const window = {
  vendorId: "v-1",
  startsAt: "2026-12-01T00:00:00.000Z",
  endsAt: "2026-12-03T00:00:00.000Z",
};
const payload = (over: Record<string, unknown> = {}) => ({
  vendor_id: "v-1",
  starts_at: window.startsAt,
  ends_at: window.endsAt,
  cups: 120,
  ...over,
});
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.restoreAllMocks();
  mocks.listLiveProducts.mockReset();
});

describe("fetchEventPassUsage", () => {
  it("calls the usage endpoint with the bearer and window", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(reply(payload()));
    expect(await fetchEventPassUsage(kit, window)).toEqual({
      ok: true,
      cups: 120,
    });
    const [url, init] = spy.mock.calls[0] as [URL, RequestInit];
    const u = new URL(url.toString());
    expect(u.pathname).toBe("/api/merqo/event-pass-usage");
    expect(u.searchParams.get("vendor_id")).toBe("v-1");
    expect(u.searchParams.get("starts_at")).toBe(window.startsAt);
    expect(u.searchParams.get("ends_at")).toBe(window.endsAt);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer s",
    );
  });

  it("is unavailable without an app_url or secret", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect(
      await fetchEventPassUsage({ ...kit, app_url: null }, window),
    ).toEqual({ ok: false });
    expect(
      await fetchEventPassUsage({ ...kit, metrics_secret: null }, window),
    ).toEqual({ ok: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it("is unavailable on http errors, network errors and bad payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({}, 401));
    expect(await fetchEventPassUsage(kit, window)).toEqual({ ok: false });
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("down"));
    expect(await fetchEventPassUsage(kit, window)).toEqual({ ok: false });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      reply(payload({ cups: -1 })),
    );
    expect(await fetchEventPassUsage(kit, window)).toEqual({ ok: false });
  });

  it("rejects a reply for another vendor", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply(payload({ vendor_id: "v-2" })),
    );
    expect(await fetchEventPassUsage(kit, window)).toEqual({ ok: false });
  });
});

describe("getEventPassUsage", () => {
  it("uses the qkit registry row", async () => {
    mocks.listLiveProducts.mockResolvedValue([
      { ...kit, slug: "loopkit", app_url: "https://loop.example" },
      kit,
    ]);
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(reply(payload({ cups: 7 })));
    expect(await getEventPassUsage(window)).toEqual({ ok: true, cups: 7 });
    expect(String((spy.mock.calls[0] as [URL])[0])).toContain(
      "qkit.vercel.app",
    );
  });

  it("is unavailable when qkit is not in the registry or the read fails", async () => {
    mocks.listLiveProducts.mockResolvedValueOnce([]);
    expect(await getEventPassUsage(window)).toEqual({ ok: false });
    mocks.listLiveProducts.mockRejectedValueOnce(new Error("db"));
    expect(await getEventPassUsage(window)).toEqual({ ok: false });
  });
});
