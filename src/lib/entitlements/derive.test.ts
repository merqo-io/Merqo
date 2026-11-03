import { describe, expect, it } from "vitest";
import type { Plan } from "@/lib/pricing/catalog";
import {
  deriveEntitlements,
  type EventPassInput,
  type SubscriptionInput,
} from "./derive";

const NOW = new Date("2026-11-10T00:00:00.000Z");
const FUTURE = "2027-03-01T00:00:00.000Z";
const PAST = "2026-10-01T00:00:00.000Z";
const ALL = ["qkit", "printkit", "loopkit", "paykit", "stockkit"];

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

const CATALOG: Plan[] = [
  plan("free", "free", ["qkit"]),
  plan("starter", "starter", ["qkit"]),
  plan("qkit", "kit", ["qkit", "printkit"]),
  plan("loopkit", "kit", ["loopkit"]),
  plan("stockkit", "kit", ["stockkit"]),
  plan("all_access", "bundle", ALL),
  plan("event_pass", "event_pass", ["qkit", "printkit", "paykit"]),
];

function sub(
  planSlug: string,
  extra: Partial<SubscriptionInput> = {},
): SubscriptionInput {
  const included = CATALOG.find((p) => p.slug === planSlug)?.includedKits ?? [];
  return {
    planSlug,
    status: "active",
    currentPeriodEnd: FUTURE,
    includedKits: included,
    founder: false,
    founderUntil: null,
    ...extra,
  };
}

function derive(
  subscriptions: SubscriptionInput[],
  eventPasses: EventPassInput[] = [],
  liveKits = ALL,
) {
  return deriveEntitlements({
    subscriptions,
    eventPasses,
    catalog: CATALOG,
    liveKits,
    now: NOW,
  });
}

describe("deriveEntitlements", () => {
  it("defaults every live kit to free with a 24h window", () => {
    const out = derive([]);
    expect(Object.keys(out).sort()).toEqual([...ALL].sort());
    for (const e of Object.values(out)) {
      expect(e).toEqual({
        tier: "free",
        founder: false,
        stats_window: "24h",
        event_pass: null,
        valid_until: null,
      });
    }
  });

  it("treats the free plan like no plan", () => {
    expect(derive([sub("free")]).qkit.tier).toBe("free");
  });

  it("gives starter the starter qkit tier, 24h stats and no printkit", () => {
    const out = derive([sub("starter")]);
    expect(out.qkit).toMatchObject({
      tier: "starter",
      stats_window: "24h",
      valid_until: FUTURE,
    });
    expect(out.printkit.tier).toBe("free");
  });

  it("gives the qkit plan qkit, printkit and 90d stats", () => {
    const out = derive([sub("qkit")]);
    expect(out.qkit.tier).toBe("qkit");
    expect(out.printkit.tier).toBe("paid");
    expect(out.printkit.valid_until).toBe(FUTURE);
    expect(out.qkit.stats_window).toBe("90d");
    expect(out.loopkit.tier).toBe("free");
  });

  it("derives printkit for a qkit/printkit-only target list", () => {
    const kits = ["qkit", "printkit"];
    expect(derive([sub("starter")], [], kits).printkit.tier).toBe("free");
    expect(derive([sub("all_access")], [], kits).printkit.tier).toBe("paid");
    const founder = derive(
      [sub("loopkit", { founder: true, founderUntil: FUTURE })],
      [],
      kits,
    );
    expect(founder.printkit.tier).toBe("paid");
  });

  it("gives a single-kit plan only that kit as paid", () => {
    const out = derive([sub("loopkit")]);
    expect(out.loopkit.tier).toBe("paid");
    expect(out.stockkit.tier).toBe("free");
    expect(out.qkit.tier).toBe("free");
    expect(out.loopkit.stats_window).toBe("24h");
  });

  it("expands All Access to every live kit", () => {
    const out = derive([sub("all_access")]);
    expect(out.qkit.tier).toBe("qkit");
    for (const kit of ALL.slice(1)) expect(out[kit].tier).toBe("paid");
    expect(out.paykit.stats_window).toBe("90d");
  });

  it("expands All Access to kits added to the bundle but not yet live", () => {
    const out = derive([sub("all_access")], [], ["qkit"]);
    expect(Object.keys(out)).toEqual(["qkit"]);
    expect(out.qkit.stats_window).toBe("90d");
  });

  it("gives an active founder every kit and 90d stats", () => {
    const out = derive([
      sub("loopkit", { founder: true, founderUntil: FUTURE }),
    ]);
    expect(out.qkit).toMatchObject({
      tier: "qkit",
      founder: true,
      stats_window: "90d",
    });
    expect(out.stockkit.tier).toBe("paid");
  });

  it("reverts an expired founder to the plain plan and drops the badge", () => {
    const out = derive([sub("loopkit", { founder: true, founderUntil: PAST })]);
    expect(out.qkit.tier).toBe("free");
    expect(out.loopkit.tier).toBe("paid");
    expect(out.loopkit.founder).toBe(false);
    expect(out.qkit.stats_window).toBe("24h");
  });

  it("drops the founder badge for a cancelled founder subscription", () => {
    const out = derive([
      sub("loopkit", {
        founder: true,
        founderUntil: FUTURE,
        status: "canceled",
      }),
    ]);
    expect(out.qkit).toMatchObject({ tier: "free", founder: false });
  });

  it("drops the founder badge once the paid period has passed", () => {
    const out = derive([
      sub("loopkit", {
        founder: true,
        founderUntil: FUTURE,
        currentPeriodEnd: PAST,
      }),
    ]);
    expect(out.qkit).toMatchObject({ tier: "free", founder: false });
  });

  it("ends founder benefits when the paid period ends first", () => {
    const out = derive([
      sub("loopkit", {
        founder: true,
        founderUntil: FUTURE,
        currentPeriodEnd: "2026-11-20T00:00:00.000Z",
      }),
    ]);
    expect(out.qkit.valid_until).toBe("2026-11-20T00:00:00.000Z");
  });

  it("ignores founder benefits with no founder_until", () => {
    const out = derive([sub("loopkit", { founder: true })]);
    expect(out.qkit.tier).toBe("free");
  });

  it("ignores canceled, expired and lapsed subscriptions", () => {
    expect(derive([sub("qkit", { status: "canceled" })]).qkit.tier).toBe(
      "free",
    );
    expect(derive([sub("qkit", { status: "expired" })]).qkit.tier).toBe("free");
    expect(derive([sub("qkit", { currentPeriodEnd: PAST })]).qkit.tier).toBe(
      "free",
    );
  });

  it("ignores a subscription to a plan missing from the catalog", () => {
    expect(derive([sub("ghost", { includedKits: ["qkit"] })]).qkit.tier).toBe(
      "free",
    );
  });

  it("takes the highest tier across overlapping sources", () => {
    const out = derive([sub("starter"), sub("qkit"), sub("loopkit")]);
    expect(out.qkit.tier).toBe("qkit");
    expect(out.loopkit.tier).toBe("paid");
  });

  it("uses the latest end among sources at the winning tier", () => {
    const out = derive([
      sub("qkit", { currentPeriodEnd: "2026-12-01T00:00:00.000Z" }),
      sub("all_access", { currentPeriodEnd: "2027-06-01T00:00:00.000Z" }),
    ]);
    expect(out.qkit.valid_until).toBe("2027-06-01T00:00:00.000Z");
  });

  it("omits kits that are not live", () => {
    const out = derive([sub("qkit")], [], ["qkit", "loopkit"]);
    expect(Object.keys(out).sort()).toEqual(["loopkit", "qkit"]);
  });

  describe("event pass", () => {
    const window = {
      startsAt: "2026-11-09T00:00:00.000Z",
      endsAt: "2026-11-11T00:00:00.000Z",
      status: "active",
    };

    it("sends a running pass to qkit, printkit and paykit only", () => {
      const out = derive([], [window]);
      const expected = {
        starts_at: "2026-11-09T00:00:00.000Z",
        ends_at: "2026-11-11T00:00:00.000Z",
      };
      expect(out.qkit.event_pass).toEqual(expected);
      expect(out.printkit.event_pass).toEqual(expected);
      expect(out.paykit.event_pass).toEqual(expected);
      expect(out.loopkit.event_pass).toBeNull();
    });

    it("leaves the tier untouched", () => {
      const out = derive([], [window]);
      expect(out.qkit.tier).toBe("free");
      expect(out.qkit.valid_until).toBeNull();
      expect(out.qkit.stats_window).toBe("24h");
    });

    it("sends a future pass so the kit can apply the window", () => {
      const out = derive(
        [],
        [
          {
            ...window,
            startsAt: "2026-12-01T00:00:00Z",
            endsAt: "2026-12-03T00:00:00Z",
          },
        ],
      );
      expect(out.qkit.event_pass?.starts_at).toBe("2026-12-01T00:00:00.000Z");
    });

    it("drops expired and cancelled passes", () => {
      expect(
        derive([], [{ ...window, endsAt: "2026-11-09T12:00:00.000Z" }]).qkit
          .event_pass,
      ).toBeNull();
      expect(
        derive([], [{ ...window, status: "cancelled" }]).qkit.event_pass,
      ).toBeNull();
    });

    it("prefers the running pass over an upcoming one", () => {
      const upcoming = {
        ...window,
        startsAt: "2026-12-01T00:00:00.000Z",
        endsAt: "2026-12-03T00:00:00.000Z",
      };
      expect(derive([], [upcoming, window]).qkit.event_pass?.ends_at).toBe(
        "2026-11-11T00:00:00.000Z",
      );
    });

    it("picks the soonest of several upcoming passes", () => {
      const later = {
        ...window,
        startsAt: "2027-01-01T00:00:00.000Z",
        endsAt: "2027-01-03T00:00:00.000Z",
      };
      const sooner = {
        ...window,
        startsAt: "2026-12-01T00:00:00.000Z",
        endsAt: "2026-12-03T00:00:00.000Z",
      };
      expect(derive([], [later, sooner]).qkit.event_pass?.starts_at).toBe(
        "2026-12-01T00:00:00.000Z",
      );
    });

    it("sends no pass when the catalog has no event pass plan", () => {
      const out = deriveEntitlements({
        subscriptions: [],
        eventPasses: [window],
        catalog: CATALOG.filter((p) => p.kind !== "event_pass"),
        liveKits: ALL,
        now: NOW,
      });
      expect(out.qkit.event_pass).toBeNull();
    });
  });
});
