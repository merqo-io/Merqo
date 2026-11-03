import { describe, expect, it } from "vitest";
import { sgDay } from "./sg-date";

describe("sgDay", () => {
  it("shows a Singapore-midnight event pass start on its own date", () => {
    expect(sgDay("2026-11-01T16:00:00.000Z")).toBe("2026-11-02");
    expect(sgDay("2026-11-03T16:00:00.000Z")).toBe("2026-11-04");
  });

  it("leaves a UTC-midnight subscription period unchanged", () => {
    expect(sgDay("2026-11-02T00:00:00.000Z")).toBe("2026-11-02");
  });

  it("returns the Singapore day between 00:00 and 08:00 SGT", () => {
    expect(sgDay(Date.parse("2026-11-01T17:30:00Z"))).toBe("2026-11-02");
  });

  it("keeps the Singapore date a day ahead across the 16:00Z to 24:00Z window", () => {
    for (const hour of ["16", "18", "20", "23"]) {
      expect(sgDay(Date.parse(`2026-11-02T${hour}:20:00Z`))).toBe("2026-11-03");
    }
  });
});
