import { describe, expect, it } from "vitest";
import {
  isTrialLive,
  normalizeEmail,
  trialDaysLeft,
  TRIAL_DAYS,
} from "./trial";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Vendor@Example.COM ")).toBe("vendor@example.com");
  });

  it("drops dots and +tags for gmail", () => {
    expect(normalizeEmail("J.Doe+stall@gmail.com")).toBe("jdoe@gmail.com");
    expect(normalizeEmail("j.o.e@googlemail.com")).toBe("joe@googlemail.com");
  });

  it("drops only the +tag elsewhere", () => {
    expect(normalizeEmail("a.b+x@example.com")).toBe("a.b@example.com");
  });

  it("leaves a value with no local part alone", () => {
    expect(normalizeEmail("nope")).toBe("nope");
  });
});

describe("trial state", () => {
  const now = Date.parse("2026-11-10T00:00:00.000Z");

  it("is live while active or overridden and unexpired", () => {
    const endsAt = "2026-11-20T00:00:00.000Z";
    expect(isTrialLive({ status: "active", endsAt }, now)).toBe(true);
    expect(isTrialLive({ status: "overridden", endsAt }, now)).toBe(true);
    expect(isTrialLive({ status: "blocked", endsAt }, now)).toBe(false);
    expect(isTrialLive({ status: "ended", endsAt }, now)).toBe(false);
  });

  it("expires on read", () => {
    expect(
      isTrialLive(
        { status: "active", endsAt: "2026-11-10T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  it("rounds days left up", () => {
    expect(
      trialDaysLeft(
        { status: "active", endsAt: "2026-11-12T06:00:00.000Z" },
        now,
      ),
    ).toBe(3);
    expect(
      trialDaysLeft(
        { status: "blocked", endsAt: "2026-11-12T00:00:00.000Z" },
        now,
      ),
    ).toBe(0);
  });

  it("lasts 30 days", () => {
    expect(TRIAL_DAYS).toBe(30);
  });
});
