import { describe, expect, it } from "vitest";
import { capSummary, dollarsToCents, windowStart } from "./revenue";

describe("capSummary", () => {
  it("has no status without a cap", () => {
    expect(capSummary(123456, null)).toEqual({
      status: "none",
      percentUsed: null,
      remainingCents: null,
    });
  });

  it("is under the cap just below 80%", () => {
    expect(capSummary(7999, 10000).status).toBe("under");
  });

  it("is near the cap from 80%", () => {
    expect(capSummary(8000, 10000).status).toBe("near");
  });

  it("is near the cap just below 100%", () => {
    expect(capSummary(9999, 10000).status).toBe("near");
  });

  it("is over the cap at 100% and reports nothing remaining", () => {
    expect(capSummary(10000, 10000)).toEqual({
      status: "over",
      percentUsed: 100,
      remainingCents: 0,
    });
    expect(capSummary(12000, 10000).remainingCents).toBe(0);
  });

  it("reports the remaining cents", () => {
    expect(capSummary(2500, 10000).remainingCents).toBe(7500);
  });
});

describe("dollarsToCents", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.34", 1234],
    ["0.07", 7],
    [" 3.00 ", 300],
    ["19.99", 1999],
  ])("converts %s", (input, expected) => {
    expect(dollarsToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "-1", "1,000", ".5", "9".repeat(20)])(
    "rejects %s",
    (input) => {
      expect(dollarsToCents(input)).toBeNull();
    },
  );
});

describe("windowStart", () => {
  it("uses the stored date", () => {
    expect(windowStart("2026-03-05", Date.parse("2026-09-01T00:00:00Z"))).toBe(
      "2026-03-05",
    );
  });

  it("defaults to 1 January of the Singapore year", () => {
    expect(windowStart(null, Date.parse("2026-09-01T00:00:00Z"))).toBe(
      "2026-01-01",
    );
  });

  it("uses the Singapore year at a UTC year boundary", () => {
    expect(windowStart(null, Date.parse("2026-12-31T17:00:00Z"))).toBe(
      "2027-01-01",
    );
  });
});
