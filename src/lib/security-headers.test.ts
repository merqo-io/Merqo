import { describe, expect, it } from "vitest";
import { cspOptions } from "./security-headers";

describe("cspOptions", () => {
  it("allows Google profile pictures, so the account menu avatar loads", () => {
    expect(cspOptions(false).imgSrc).toContain(
      "https://*.googleusercontent.com",
    );
  });
});
