import { describe, it, expect } from "vitest";
import { formatMoney, formatRelativeTime } from "@merqo/ui";
import { computeTrend } from "@/lib/format";

describe("computeTrend", () => {
  it("reports an increase", () => {
    expect(computeTrend(120, 100)).toEqual({ direction: "up", pct: 20 });
  });

  it("reports a decrease", () => {
    expect(computeTrend(80, 100)).toEqual({ direction: "down", pct: 20 });
  });

  it("reports flat when unchanged and nonzero", () => {
    expect(computeTrend(50, 50)).toEqual({ direction: "flat", pct: 0 });
  });

  it("reports flat with a null pct when both are zero", () => {
    expect(computeTrend(0, 0)).toEqual({ direction: "flat", pct: null });
  });

  it("reports up with a null pct when previous is zero but current is not", () => {
    expect(computeTrend(5, 0)).toEqual({ direction: "up", pct: null });
  });
});

describe("shared formatters as merqo renders them", () => {
  const now = Date.parse("2026-07-26T12:00:00Z");

  it("shows relative times in the coarse units the cards use", () => {
    expect(formatRelativeTime("2026-07-26T11:59:31Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-07-26T11:57:00Z", now)).toBe("3m ago");
    expect(formatRelativeTime("2026-07-26T09:30:00Z", now)).toBe("2h ago");
    expect(formatRelativeTime("2026-07-23T12:00:00Z", now)).toBe("3d ago");
  });

  it("falls back to the Singapore date after a week", () => {
    expect(formatRelativeTime("2026-07-10T12:00:00Z", now)).toBe("10 Jul 2026");
  });

  it("returns a dash for an unparseable timestamp", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("-");
  });

  it("formats cents as Singapore dollars", () => {
    expect(formatMoney(1250)).toBe("S$12.50");
    expect(formatMoney(1600)).toBe("S$16.00");
    expect(formatMoney(123456)).toBe("S$1,234.56");
  });
});
