import { describe, expect, it } from "vitest";
import { tierLabel } from "./tier-label";

describe("tierLabel", () => {
  it("labels the stored qkit tier as Pro", () => {
    expect(tierLabel("qkit")).toBe("Pro");
  });

  it("labels free and starter", () => {
    expect(tierLabel("free")).toBe("Free");
    expect(tierLabel("starter")).toBe("Starter");
  });

  it("returns undefined for values with no tier label", () => {
    expect(tierLabel("paid")).toBeUndefined();
    expect(tierLabel("loopkit")).toBeUndefined();
  });
});
