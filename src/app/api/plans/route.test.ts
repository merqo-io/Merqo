import { describe, it, expect, vi, beforeEach } from "vitest";

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }));
vi.mock("@/lib/pricing/public-catalog", () => ({
  loadPublicPlanCatalog: loadMock,
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

beforeEach(() => {
  loadMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/plans", () => {
  it("returns the catalog with public CDN caching", async () => {
    loadMock.mockResolvedValue(CATALOG);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(CATALOG);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(res.headers.get("Cache-Control")).toContain("public");
  });

  it("returns a generic 500 without internals when the load fails", async () => {
    loadMock.mockRejectedValue(new Error("relation merqo.plans secret detail"));
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Plans are unavailable" });
    expect(JSON.stringify(body)).not.toContain("secret detail");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
