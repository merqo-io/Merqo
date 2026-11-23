import { describe, expect, it } from "vitest";
import {
  founderClosedByDate,
  founderCloseDate,
  formatFounderNumber,
} from "./founder";

describe("formatFounderNumber", () => {
  it("zero-pads single digits", () => {
    expect(formatFounderNumber(1)).toBe("#01");
    expect(formatFounderNumber(9)).toBe("#09");
  });

  it("leaves two digits alone", () => {
    expect(formatFounderNumber(20)).toBe("#20");
  });
});

describe("founderCloseDate", () => {
  it("is null with no open date or a bad one", () => {
    expect(founderCloseDate(null)).toBeNull();
    expect(founderCloseDate("nope")).toBeNull();
  });

  it("is 60 days after billing opens", () => {
    expect(founderCloseDate("2026-12-01T00:00:00.000Z")?.toISOString()).toBe(
      "2027-01-30T00:00:00.000Z",
    );
  });
});

describe("founderClosedByDate", () => {
  const opens = "2026-12-01T00:00:00.000Z";
  const close = Date.parse("2027-01-30T00:00:00.000Z");

  it("is open with no open date", () => {
    expect(founderClosedByDate(null, close + 1)).toBe(false);
  });

  it("is open up to the close instant and closed after it", () => {
    expect(founderClosedByDate(opens, close)).toBe(false);
    expect(founderClosedByDate(opens, close + 1)).toBe(true);
  });
});
