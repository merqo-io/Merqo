import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { fetchKitJson } from "@/lib/kit-action-request";

afterEach(() => vi.restoreAllMocks());

const schema = z.object({ value: z.number() });

describe("fetchKitJson", () => {
  it("returns ok:true with the parsed data on a valid response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ value: 1 }), { status: 200 }),
    );
    const r = await fetchKitJson("https://x/api", schema);
    expect(r).toEqual({ ok: true, status: 200, data: { value: 1 } });
  });

  it("returns kind:http (with status) on a non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 503 }),
    );
    const r = await fetchKitJson("https://x/api", schema);
    expect(r).toEqual({ ok: false, status: 503, kind: "http" });
  });

  it("returns kind:parse when the body isn't valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>", { status: 200 }),
    );
    const r = await fetchKitJson("https://x/api", schema);
    expect(r).toEqual({ ok: false, status: 200, kind: "parse" });
  });

  it("returns kind:schema when the body fails validation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ value: "not a number" }), { status: 200 }),
    );
    const r = await fetchKitJson("https://x/api", schema);
    expect(r).toEqual({ ok: false, status: 200, kind: "schema" });
  });

  it("returns kind:network with a null status when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const r = await fetchKitJson("https://x/api", schema);
    expect(r).toEqual({ ok: false, status: null, kind: "network" });
  });

  it("passes init through to fetch (method, headers, body)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ value: 1 }), { status: 200 }),
      );
    await fetchKitJson(
      "https://x/api",
      schema,
      { method: "POST", headers: { Authorization: "Bearer s" }, body: "{}" },
      1000,
    );
    const [, init] = fetchSpy.mock.calls[0] as [unknown, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer s",
    );
  });
});
