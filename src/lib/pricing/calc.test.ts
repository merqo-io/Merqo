import { describe, it, expect } from "vitest";
import {
  aaUpgradeCreditCents,
  annualCents,
  coTermProrationCents,
  eventPassChargeCents,
  eventPassSettleCents,
} from "./calc";

const EVENT = { perCupCents: 15, minCents: 1400, capCents: 2800 };

describe("annualCents", () => {
  it.each([
    [1600, 16000],
    [3600, 36000],
    [1200, 12000],
    [1000, 10000],
    [800, 8000],
    [1500, 15000],
    [0, 0],
  ])("%i a month is %i a year", (monthly, annual) => {
    expect(annualCents(monthly)).toBe(annual);
  });

  it("rejects non-integer or negative cents", () => {
    expect(() => annualCents(10.5)).toThrow(RangeError);
    expect(() => annualCents(-1)).toThrow(RangeError);
  });
});

describe("coTermProrationCents", () => {
  it("charges 9/12 of paykit's annual price when added on 1 Apr to a 1 Jan renewal", () => {
    expect(coTermProrationCents(8000, 9)).toBe(6000);
  });

  it("is the full price at 12 months and free at 0", () => {
    expect(coTermProrationCents(8000, 12)).toBe(8000);
    expect(coTermProrationCents(8000, 0)).toBe(0);
  });

  it("rounds half a cent up", () => {
    expect(coTermProrationCents(1, 6)).toBe(1);
    expect(coTermProrationCents(1, 5)).toBe(0);
  });

  it("rejects months outside the term", () => {
    expect(() => coTermProrationCents(8000, 13)).toThrow(RangeError);
    expect(() => coTermProrationCents(8000, 1.5)).toThrow(RangeError);
  });
});

describe("aaUpgradeCreditCents", () => {
  it("credits 5/12 of a qkit annual plan as 6667", () => {
    expect(aaUpgradeCreditCents(16000, 5)).toBe(6667);
  });

  it("credits nothing when nothing is unused", () => {
    expect(aaUpgradeCreditCents(16000, 0)).toBe(0);
  });
});

describe("eventPassChargeCents and eventPassSettleCents", () => {
  it("charges the minimum for a small event", () => {
    expect(eventPassChargeCents(0, EVENT)).toBe(1400);
    expect(eventPassChargeCents(93, EVENT)).toBe(1400);
    expect(eventPassSettleCents(93, EVENT)).toBe(0);
  });

  it("charges per cup between the bounds", () => {
    expect(eventPassChargeCents(120, EVENT)).toBe(1800);
    expect(eventPassSettleCents(120, EVENT)).toBe(400);
  });

  it("caps the charge for a big event", () => {
    expect(eventPassChargeCents(187, EVENT)).toBe(2800);
    expect(eventPassChargeCents(5000, EVENT)).toBe(2800);
    expect(eventPassSettleCents(5000, EVENT)).toBe(1400);
  });

  it("rejects negative or fractional cups", () => {
    expect(() => eventPassChargeCents(-1, EVENT)).toThrow(RangeError);
    expect(() => eventPassChargeCents(1.5, EVENT)).toThrow(RangeError);
  });
});
