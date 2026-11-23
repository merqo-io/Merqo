import { describe, expect, it } from "vitest";
import {
  GRACE_DAYS,
  prorateUpgradeCents,
  quotePlanChange,
  runningPause,
  subscriptionPhase,
  vendorStatusLine,
} from "./lifecycle";

const DAY = 86_400_000;
const END = Date.parse("2026-12-01T00:00:00Z");

const sub = (over: Partial<Parameters<typeof subscriptionPhase>[0]> = {}) => ({
  status: "active",
  source: "admin_manual",
  currentPeriodEnd: "2026-12-01T00:00:00Z",
  ...over,
});

describe("subscriptionPhase grace boundaries", () => {
  it("is active before the period ends", () => {
    expect(subscriptionPhase(sub(), END - 1)).toEqual({ kind: "active" });
  });

  it("starts grace at day 0 with the full week left", () => {
    expect(subscriptionPhase(sub(), END)).toEqual({
      kind: "grace",
      daysLeft: GRACE_DAYS,
      untilMs: END + GRACE_DAYS * DAY,
    });
  });

  it("still grants on day 7 with no days left", () => {
    expect(subscriptionPhase(sub(), END + 7 * DAY)).toMatchObject({
      kind: "grace",
      daysLeft: 0,
    });
  });

  it("counts a started day as a day left", () => {
    expect(subscriptionPhase(sub(), END + 2.5 * DAY)).toMatchObject({
      kind: "grace",
      daysLeft: 5,
    });
  });

  it("expires on day 8", () => {
    expect(subscriptionPhase(sub(), END + 8 * DAY)).toEqual({
      kind: "expired",
    });
  });

  it("gives no grace to a source that renews itself", () => {
    expect(subscriptionPhase(sub({ source: "stripe" }), END)).toEqual({
      kind: "expired",
    });
    expect(subscriptionPhase(sub({ source: "" }), END)).toEqual({
      kind: "expired",
    });
  });

  it("treats closed rows and unreadable dates as expired", () => {
    expect(subscriptionPhase(sub({ status: "canceled" }), END - DAY)).toEqual({
      kind: "expired",
    });
    expect(subscriptionPhase(sub({ currentPeriodEnd: "nope" }), END)).toEqual({
      kind: "expired",
    });
  });
});

describe("pauses", () => {
  const pauses = [{ startsOn: "2026-11-10", endsOn: "2026-11-20" }];

  it("covers its first day and not its end day", () => {
    const start = Date.parse("2026-11-10T00:00:00Z");
    const end = Date.parse("2026-11-20T00:00:00Z");
    expect(runningPause(pauses, start - 1)).toBeNull();
    expect(runningPause(pauses, start)).toEqual(pauses[0]);
    expect(runningPause(pauses, end - 1)).toEqual(pauses[0]);
    expect(runningPause(pauses, end)).toBeNull();
    expect(runningPause(undefined, start)).toBeNull();
  });

  it("makes an in-period subscription paused until the end date", () => {
    const now = Date.parse("2026-11-15T00:00:00Z");
    expect(subscriptionPhase(sub({ pauses }), now)).toEqual({
      kind: "paused",
      endsOn: "2026-11-20",
    });
  });
});

describe("prorateUpgradeCents", () => {
  const month = {
    periodStartMs: Date.parse("2026-11-01T00:00:00Z"),
    periodEndMs: Date.parse("2026-12-01T00:00:00Z"),
  };

  it("charges the full difference on the first day", () => {
    expect(
      prorateUpgradeCents({
        ...month,
        oldCents: 1490,
        newCents: 1990,
        nowMs: month.periodStartMs,
      }),
    ).toBe(500);
  });

  it("scales by days left over days in a 30 day month", () => {
    expect(
      prorateUpgradeCents({
        ...month,
        oldCents: 1490,
        newCents: 1990,
        nowMs: Date.parse("2026-11-16T00:00:00Z"),
      }),
    ).toBe(250);
  });

  it("rounds to the nearest cent", () => {
    expect(
      prorateUpgradeCents({
        ...month,
        oldCents: 1490,
        newCents: 1990,
        nowMs: Date.parse("2026-11-11T00:00:00Z"),
      }),
    ).toBe(Math.round((500 * 20) / 30));
  });

  it("still owes one day on the last day and nothing after", () => {
    const lastDay = Date.parse("2026-11-30T06:00:00Z");
    expect(
      prorateUpgradeCents({
        ...month,
        oldCents: 1490,
        newCents: 1990,
        nowMs: lastDay,
      }),
    ).toBe(Math.round(500 / 30));
    expect(
      prorateUpgradeCents({
        ...month,
        oldCents: 1490,
        newCents: 1990,
        nowMs: month.periodEndMs,
      }),
    ).toBe(0);
  });

  it("prorates a year over 365 days", () => {
    const periodStartMs = Date.parse("2026-01-01T00:00:00Z");
    const periodEndMs = Date.parse("2027-01-01T00:00:00Z");
    expect(
      prorateUpgradeCents({
        periodStartMs,
        periodEndMs,
        oldCents: 14900,
        newCents: 19900,
        nowMs: Date.parse("2026-07-02T00:00:00Z"),
      }),
    ).toBe(Math.round((5000 * 183) / 365));
  });

  it("never exceeds the full difference or goes negative", () => {
    expect(
      prorateUpgradeCents({
        ...month,
        oldCents: 1490,
        newCents: 1990,
        nowMs: month.periodStartMs - 5 * DAY,
      }),
    ).toBe(500);
    expect(
      prorateUpgradeCents({
        ...month,
        oldCents: 1990,
        newCents: 1490,
        nowMs: month.periodStartMs,
      }),
    ).toBe(0);
    expect(
      prorateUpgradeCents({
        periodStartMs: 5,
        periodEndMs: 5,
        oldCents: 1,
        newCents: 2,
        nowMs: 5,
      }),
    ).toBe(0);
  });
});

describe("prorateUpgradeCents with pauses", () => {
  const stretched = {
    oldCents: 1490,
    newCents: 1990,
    periodStartMs: Date.parse("2026-11-01T00:00:00Z"),
    periodEndMs: Date.parse("2026-12-11T00:00:00Z"),
    pauses: [{ startsOn: "2026-11-11", endsOn: "2026-11-21" }],
  };

  it("leaves a past pause out of the days in the period and the days left", () => {
    expect(
      prorateUpgradeCents({
        ...stretched,
        nowMs: Date.parse("2026-11-25T00:00:00Z"),
      }),
    ).toBe(267);
  });

  it("leaves a coming pause out of the days left", () => {
    expect(
      prorateUpgradeCents({
        ...stretched,
        nowMs: Date.parse("2026-11-05T00:00:00Z"),
      }),
    ).toBe(433);
  });

  it("ignores a pause outside the period", () => {
    expect(
      prorateUpgradeCents({
        ...stretched,
        pauses: [{ startsOn: "2027-02-01", endsOn: "2027-02-11" }],
        nowMs: Date.parse("2026-11-25T00:00:00Z"),
      }),
    ).toBe(200);
  });

  it("passes the pauses through a plan change quote", () => {
    expect(
      quotePlanChange({
        interval: "month",
        lockedPriceCents: 1490,
        currentPeriodStart: "2026-11-01T00:00:00Z",
        currentPeriodEnd: "2026-12-11T00:00:00Z",
        newMonthlyCents: 1990,
        nowMs: Date.parse("2026-11-25T00:00:00Z"),
        pauses: stretched.pauses,
      }),
    ).toEqual({ kind: "upgrade", newPriceCents: 1990, owedCents: 267 });
  });
});

describe("quotePlanChange", () => {
  const base = {
    interval: "month" as const,
    lockedPriceCents: 1490,
    currentPeriodStart: "2026-11-01T00:00:00Z",
    currentPeriodEnd: "2026-12-01T00:00:00Z",
    nowMs: Date.parse("2026-11-16T00:00:00Z"),
  };

  it("applies a dearer plan now with the pro-rata amount owed", () => {
    expect(quotePlanChange({ ...base, newMonthlyCents: 1990 })).toEqual({
      kind: "upgrade",
      newPriceCents: 1990,
      owedCents: 250,
    });
  });

  it("prices an annual subscription at ten months", () => {
    expect(
      quotePlanChange({
        ...base,
        interval: "year",
        lockedPriceCents: 14900,
        currentPeriodStart: "2026-01-01T00:00:00Z",
        currentPeriodEnd: "2027-01-01T00:00:00Z",
        nowMs: Date.parse("2026-01-01T00:00:00Z"),
        newMonthlyCents: 1990,
      }),
    ).toEqual({ kind: "upgrade", newPriceCents: 19900, owedCents: 5000 });
  });

  it("schedules a cheaper or equal plan for renewal", () => {
    expect(quotePlanChange({ ...base, newMonthlyCents: 1000 })).toEqual({
      kind: "downgrade",
      newPriceCents: 1000,
    });
    expect(quotePlanChange({ ...base, newMonthlyCents: 1490 })).toEqual({
      kind: "downgrade",
      newPriceCents: 1490,
    });
  });
});

describe("vendorStatusLine", () => {
  const now = END + 2.5 * DAY;

  it("says nothing for healthy and lapsed subscriptions", () => {
    expect(vendorStatusLine([], now)).toBeNull();
    expect(vendorStatusLine([sub()], END - DAY)).toBeNull();
    expect(vendorStatusLine([sub()], END + 9 * DAY)).toBeNull();
  });

  it("shows the days left to renew during grace", () => {
    expect(vendorStatusLine([sub()], now)).toBe("Renewal due in 5 days");
    expect(vendorStatusLine([sub()], END + 6.5 * DAY)).toBe(
      "Renewal due in 1 day",
    );
  });

  it("shows the pause end date and prefers it over grace", () => {
    const paused = sub({
      pauses: [{ startsOn: "2026-12-02", endsOn: "2026-12-12" }],
    });
    expect(vendorStatusLine([sub(), paused], now)).toBe(
      "Plan paused until 2026-12-12",
    );
  });
});
