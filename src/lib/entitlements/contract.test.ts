import { describe, expect, it } from "vitest";
import {
  entitlementPayloadSchema,
  entitlementResponseSchema,
} from "./contract";

const base = {
  email: "v@x.com",
  kit: "qkit",
  tier: "starter",
  founder: false,
  stats_window: "24h",
  event_pass: null,
  valid_until: null,
  issued_at: "2026-11-02T00:00:00.000Z",
};

describe("entitlementPayloadSchema", () => {
  it("accepts qkit's three tiers and a pass window", () => {
    for (const tier of ["free", "starter", "qkit"]) {
      expect(
        entitlementPayloadSchema.safeParse({ ...base, tier }).success,
      ).toBe(true);
    }
    expect(
      entitlementPayloadSchema.safeParse({
        ...base,
        event_pass: {
          starts_at: "2026-12-01T00:00:00.000Z",
          ends_at: "2026-12-03T00:00:00.000Z",
        },
        valid_until: "2027-01-01T00:00:00+00:00",
      }).success,
    ).toBe(true);
  });

  it("accepts free or paid on every other kit and refuses qkit-only tiers there", () => {
    for (const tier of ["free", "paid"]) {
      expect(
        entitlementPayloadSchema.safeParse({ ...base, kit: "loopkit", tier })
          .success,
      ).toBe(true);
    }
    for (const tier of ["starter", "qkit"]) {
      expect(
        entitlementPayloadSchema.safeParse({ ...base, kit: "loopkit", tier })
          .success,
      ).toBe(false);
    }
  });

  it("refuses paid on qkit, unknown windows and malformed dates", () => {
    expect(
      entitlementPayloadSchema.safeParse({ ...base, tier: "paid" }).success,
    ).toBe(false);
    expect(
      entitlementPayloadSchema.safeParse({ ...base, stats_window: "7d" })
        .success,
    ).toBe(false);
    expect(
      entitlementPayloadSchema.safeParse({ ...base, issued_at: "yesterday" })
        .success,
    ).toBe(false);
    expect(
      entitlementPayloadSchema.safeParse({ ...base, email: "nope" }).success,
    ).toBe(false);
  });
});

describe("entitlementResponseSchema", () => {
  it("accepts only ok: true", () => {
    expect(entitlementResponseSchema.safeParse({ ok: true }).success).toBe(
      true,
    );
    expect(entitlementResponseSchema.safeParse({ ok: false }).success).toBe(
      false,
    );
  });
});
