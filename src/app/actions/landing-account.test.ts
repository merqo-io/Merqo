import { describe, it, expect, vi } from "vitest";

const { support } = vi.hoisted(() => ({
  support: vi.fn(async () => ({ success: true as const })),
}));
vi.mock("@/app/actions/support", () => ({
  submitSupportMessageAction: support,
}));

import { submitLandingSupport } from "./landing-account";

describe("submitLandingSupport", () => {
  it("maps the shared menu's message onto the support action's body", async () => {
    const res = await submitLandingSupport({
      category: "billing",
      message: "Charged twice",
    });
    expect(support).toHaveBeenCalledWith({
      category: "billing",
      body: "Charged twice",
    });
    expect(res).toEqual({ success: true });
  });
});
