import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  recordAudit: vi.fn(),
  setBillingOpensAt: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/admin", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("@/lib/entitlements/billing-config", () => ({
  setBillingOpensAt: mocks.setBillingOpensAt,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { setBillingOpensAtAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "admin-1" } });
  mocks.setBillingOpensAt.mockResolvedValue(undefined);
});

describe("setBillingOpensAtAction", () => {
  it("saves a Singapore midnight, audits and revalidates", async () => {
    expect(await setBillingOpensAtAction({ date: "2026-12-01" })).toEqual({
      success: true,
    });
    expect(mocks.setBillingOpensAt).toHaveBeenCalledWith(
      "2026-11-30T16:00:00.000Z",
    );
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "set_billing_opens_at",
      null,
      { billing_opens_at: "2026-11-30T16:00:00.000Z" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/waitlist");
  });

  it("clears the date with null", async () => {
    expect(await setBillingOpensAtAction({ date: null })).toEqual({
      success: true,
    });
    expect(mocks.setBillingOpensAt).toHaveBeenCalledWith(null);
  });

  it("rejects a malformed or impossible date", async () => {
    for (const date of ["12/01/2026", "2026-13-45", ""]) {
      expect(await setBillingOpensAtAction({ date })).toEqual({
        success: false,
        error: "Pick a valid date.",
      });
    }
    expect(mocks.setBillingOpensAt).not.toHaveBeenCalled();
  });

  it("returns a generic error when the write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.setBillingOpensAt.mockRejectedValue(new Error("db"));
    expect(await setBillingOpensAtAction({ date: "2026-12-01" })).toEqual({
      success: false,
      error: "Could not save that. Try again.",
    });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });
});
