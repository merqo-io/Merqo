import { describe, expect, it } from "vitest";
import { formatSgd, planLabel } from "./format";

describe("pricing format", () => {
  it("formats cents as Singapore dollars with two decimals", () => {
    expect(formatSgd(0)).toBe("S$0.00");
    expect(formatSgd(1600)).toBe("S$16.00");
    expect(formatSgd(1250)).toBe("S$12.50");
  });

  it("labels known plans and falls back to the slug", () => {
    expect(planLabel("all_access")).toBe("All Access");
    expect(planLabel("qkit")).toBe("Qkit");
    expect(planLabel("mystery")).toBe("mystery");
  });
});
