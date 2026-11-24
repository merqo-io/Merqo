import { describe, expect, it } from "vitest";
import type { Plan } from "@/lib/pricing/catalog";
import { deriveEntitlements, type SubscriptionInput } from "./derive";

const NOW = new Date("2026-11-10T00:00:00.000Z");
const FUTURE = "2027-03-01T00:00:00.000Z";
const TRIAL_END = "2026-11-25T00:00:00.000Z";
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

describe("deriveEntitlements grace and pauses", () => {
  it("keeps the plan through the week after the period ends", () => {
    expect(run([lapsed(0)]).qkit.tier).toBe("qkit");
    expect(run([lapsed(7)]).qkit.tier).toBe("qkit");
  });

  it("drops the plan on day 8 and for sources that renew themselves", () => {
    expect(run([lapsed(8)]).qkit.tier).toBe("free");
    expect(run([lapsed(1, { source: "stripe" })]).qkit.tier).toBe("free");
  });

  it("grants nothing during a pause and falls back to the trial", () => {
    const paused = sub({
      pauses: [{ startsOn: "2026-11-05", endsOn: "2026-11-15" }],
    });
    expect(run([paused]).qkit.tier).toBe("free");
    expect(
      run([paused], { status: "active", endsAt: TRIAL_END }).qkit.tier,
    ).toBe("qkit");
  });

  it("resumes once the pause is over", () => {
    const done = sub({
      pauses: [{ startsOn: "2026-11-01", endsOn: "2026-11-05" }],
    });
    expect(run([done]).qkit.tier).toBe("qkit");
  });

  it("turns founder benefits off while paused", () => {
    const founder = { founder: true, founderUntil: FUTURE };
    const paused = sub({
      ...founder,
      pauses: [{ startsOn: "2026-11-05", endsOn: "2026-11-15" }],
    });
    expect(run([paused]).printkit.tier).toBe("free");
  });
});
