import { describe, expect, it } from "vitest";
import { countHealth } from "./health";

describe("countHealth", () => {
  it("counts each kit once, so lagging kits are not also reporting", () => {
    expect(
      countHealth(["reporting", "lagging", "lagging", "reporting", "down"]),
    ).toEqual({ reporting: 2, lagging: 2, down: 1 });
  });

  it("returns zeros for no kits", () => {
    expect(countHealth([])).toEqual({ reporting: 0, lagging: 0, down: 0 });
  });
});
