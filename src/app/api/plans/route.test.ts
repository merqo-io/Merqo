import { describe, it, expect, vi, beforeEach } from "vitest";

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }));
vi.mock("@/lib/pricing/public-catalog", () => ({
  loadPublicPlanCatalog: loadMock,
}));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: async () => true,
}));

import { GET } from "./route";

const CATALOG = {
  plans: [
    {
      slug: "free",
      kind: "free",
      name: "Free",
      monthly_cents: 0,
      annual_cents: 0,
      kits: ["qkit"],
    },
  ],
  event_pass: { per_cup_cents: 15, min_cents: 1400, cap_cents: 2800, days: 2 },
};

function req(auth?: string) {
  return new Request("http://localhost/api/plans", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  process.env.MERQO_CUSTOMER_SECRET = "test-secret";
  loadMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("GET /api/plans", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer", async () => {
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("returns the catalog uncached for the right bearer", async () => {
    loadMock.mockResolvedValue(CATALOG);
    const res = await GET(req("Bearer test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(CATALOG);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns a generic 500 without internals when the load fails", async () => {
    loadMock.mockRejectedValue(new Error("relation merqo.plans secret detail"));
    const res = await GET(req("Bearer test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Plans are unavailable" });
    expect(JSON.stringify(body)).not.toContain("secret detail");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
