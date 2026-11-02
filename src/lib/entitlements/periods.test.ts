import { describe, expect, it } from "vitest";
import { addMonths, founderUntil, periodEnd } from "./periods";

describe("periods", () => {
  it("adds calendar months in UTC", () => {
    expect(addMonths(new Date("2026-01-15T00:00:00Z"), 1).toISOString()).toBe(
      "2026-02-15T00:00:00.000Z",
    );
    expect(addMonths(new Date("2026-11-30T09:30:00Z"), 3).toISOString()).toBe(
      "2027-02-28T09:30:00.000Z",
    );
  });

  it("clamps to the last day of a shorter month", () => {
    expect(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
    expect(addMonths(new Date("2024-01-31T00:00:00Z"), 1).toISOString()).toBe(
      "2024-02-29T00:00:00.000Z",
    );
  });

  it("derives the period end from the interval", () => {
    const start = new Date("2026-03-10T00:00:00Z");
    expect(periodEnd(start, "month").toISOString()).toBe(
      "2026-04-10T00:00:00.000Z",
    );
    expect(periodEnd(start, "year").toISOString()).toBe(
      "2027-03-10T00:00:00.000Z",
    );
  });

  it("ends founder benefits a year after the start", () => {
    expect(founderUntil(new Date("2026-03-10T00:00:00Z")).toISOString()).toBe(
      "2027-03-10T00:00:00.000Z",
    );
  });
});
