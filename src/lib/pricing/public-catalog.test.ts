import { describe, it, expect, vi, beforeEach } from "vitest";

const { fromMock, createServerClientMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  createServerClientMock: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { loadPublicPlanCatalog } from "./public-catalog";

function row(slug: string, kind: string, monthly: number, kits: string[]) {
  return {
    slug,
    kind,
    monthly_cents: monthly,
    included_kits: kits,
    active: true,
    per_cup_cents: null,
    min_cents: null,
    cap_cents: null,
    duration_days: null,
  };
}

const EVENT = {
  ...row("event_pass", "event_pass", 0, ["qkit"]),
  per_cup_cents: 15,
  min_cents: 1400,
  cap_cents: 2800,
  duration_days: 2,
};

// Deliberately unordered, with an inactive row, to prove the loader sorts and filters.
const ROWS = [
  { ...row("all_access", "bundle", 3600, ["qkit", "loopkit"]), active: false },
  EVENT,
  { ...row("paykit", "kit", 800, ["paykit"]), active: false },
  row("qkit", "kit", 1990, ["qkit", "printkit", "paykit"]),
  row("free", "free", 0, ["qkit"]),
  { ...row("loopkit", "kit", 1000, ["loopkit"]), active: false },
  row("starter", "starter", 1490, ["qkit", "paykit"]),
  { ...row("stockkit", "kit", 1500, ["stockkit"]), active: false },
];

function mockQuery(result: { data: unknown; error: unknown }) {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  fromMock.mockReturnValue(q);
  return q;
}

beforeEach(() => {
  fromMock.mockReset();
  createServerClientMock.mockReset();
  createServerClientMock.mockReturnValue({ from: fromMock });
});

describe("loadPublicPlanCatalog", () => {
  it("maps rows to the contract shape ordered by monthly price", async () => {
    mockQuery({ data: ROWS, error: null });
    const out = await loadPublicPlanCatalog();
    expect(out.plans.map((p) => [p.slug, p.monthly_cents])).toEqual([
      ["free", 0],
      ["starter", 1490],
      ["qkit", 1990],
    ]);
    expect(out.plans[2]).toEqual({
      slug: "qkit",
      kind: "kit",
      name: "Pro",
      monthly_cents: 1990,
      annual_cents: 19900,
      kits: ["qkit", "printkit", "paykit"],
    });
  });

  it("excludes inactive rows and event_pass from plans and maps the pass terms", async () => {
    mockQuery({ data: ROWS, error: null });
    const out = await loadPublicPlanCatalog();
    const slugs = out.plans.map((p) => p.slug);
    for (const off of ["paykit", "loopkit", "stockkit", "all_access"]) {
      expect(slugs).not.toContain(off);
    }
    expect(slugs).not.toContain("event_pass");
    expect(out.event_pass).toEqual({
      per_cup_cents: 15,
      min_cents: 1400,
      cap_cents: 2800,
      days: 2,
    });
  });

  it("queries active rows through the anon key with no cookies", async () => {
    const q = mockQuery({ data: ROWS, error: null });
    await loadPublicPlanCatalog();
    expect(q.eq).toHaveBeenCalledWith("active", true);
    const opts = createServerClientMock.mock.calls[0][2];
    expect(opts.cookies.getAll()).toEqual([]);
    expect(fromMock).toHaveBeenCalledWith("plans");
  });

  it("throws on a database error", async () => {
    mockQuery({ data: null, error: { message: "boom" } });
    await expect(loadPublicPlanCatalog()).rejects.toThrow(/boom/);
  });

  it("throws when rows fail validation", async () => {
    mockQuery({ data: [{ slug: 1 }], error: null });
    await expect(loadPublicPlanCatalog()).rejects.toThrow();
  });

  it("throws when no event pass terms exist", async () => {
    mockQuery({ data: [row("free", "free", 0, ["qkit"])], error: null });
    await expect(loadPublicPlanCatalog()).rejects.toThrow(/event pass/);
  });
});
