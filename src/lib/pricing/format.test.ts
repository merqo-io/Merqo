import { describe, expect, it } from "vitest";
import { planLabel } from "./format";

describe("pricing format", () => {
  it("labels known plans and falls back to the slug", () => {
    expect(planLabel("all_access")).toBe("All Access");
    expect(planLabel("qkit")).toBe("Pro");
    expect(planLabel("mystery")).toBe("mystery");
  });
});
