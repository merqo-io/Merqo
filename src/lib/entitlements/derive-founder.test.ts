import { describe, expect, it } from "vitest";
import type { Plan } from "@/lib/pricing/catalog";
import { deriveEntitlements, type SubscriptionInput } from "./derive";

const NOW = new Date("2026-11-10T00:00:00.000Z");
const FUTURE = "2027-03-01T00:00:00.000Z";
const ALL = ["qkit", "printkit", "loopkit", "paykit", "stockkit"];
const DAY = 86_400_000;

const CATALOG: Plan[] = [
  {
    slug: "free",
    kind: "free",
    monthlyCents: 0,
    includedKits: ["qkit"],
    active: true,
    eventPass: null,
  },
  {
    slug: "qkit",
    kind: "kit",
    monthlyCents: 1990,
    includedKits: ["qkit", "printkit", "paykit"],
    active: true,
    eventPass: null,
  },
  {
    slug: "all_access",
    kind: "bundle",
    monthlyCents: 0,
    includedKits: ALL,
    active: false,
    eventPass: null,
  },
];

function sub(extra: Partial<SubscriptionInput> = {}): SubscriptionInput {
  return {
    planSlug: "qkit",
    status: "active",
    currentPeriodEnd: FUTURE,
    includedKits: ["qkit", "printkit", "paykit"],
    founder: false,
    founderUntil: null,
    source: "admin_manual",
    ...extra,
  };
}

function lapsed(daysAgo: number, extra: Partial<SubscriptionInput> = {}) {
  return sub({
    currentPeriodEnd: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
    ...extra,
  });
}

function run(
  subscriptions: SubscriptionInput[],
  trial: { status: string; endsAt: string } | null = null,
) {
  return deriveEntitlements({
    subscriptions,
    eventPasses: [],
    trial,
    catalog: CATALOG,
    liveKits: ALL,
    now: NOW,
  });
}

describe("deriveEntitlements founder window", () => {
  const until = new Date(NOW.getTime() + 300 * DAY).toISOString();

  it("keeps founder benefits through grace", () => {
    const out = run([lapsed(3, { founder: true, founderUntil: until })]);
    expect(out.qkit.founder).toBe(true);
    expect(out.loopkit.tier).toBe("paid");
  });

  it("ends founder benefits with grace", () => {
    const out = run([lapsed(8, { founder: true, founderUntil: until })]);
    expect(out.qkit.founder).toBe(false);
    expect(out.qkit.tier).toBe("free");
  });

  it("turns founder benefits off while paused", () => {
    const today = NOW.toISOString().slice(0, 10);
    const out = run([
      sub({
        founder: true,
        founderUntil: until,
        pauses: [{ startsOn: today, endsOn: "2026-12-10" }],
      }),
    ]);
    expect(out.qkit.founder).toBe(false);
    expect(out.qkit.tier).toBe("free");
  });

  it("stops founder benefits once the founder window passes", () => {
    const past = new Date(NOW.getTime() - DAY).toISOString();
    const out = run([sub({ founder: true, founderUntil: past })]);
    expect(out.qkit.founder).toBe(false);
    expect(out.qkit.tier).toBe("qkit");
  });
});
