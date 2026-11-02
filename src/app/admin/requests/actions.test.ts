import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  recordAudit: vi.fn(),
  revalidatePath: vi.fn(),
  closeRequest: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/admin", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/subscription-requests", () => ({
  closeRequest: mocks.closeRequest,
}));

import { declineRequestAction } from "./actions";

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "admin-1" } });
  mocks.closeRequest.mockResolvedValue(true);
});

describe("declineRequestAction", () => {
  it("declines, audits and revalidates", async () => {
    expect(await declineRequestAction({ requestId: ID })).toEqual({
      success: true,
    });
    expect(mocks.closeRequest).toHaveBeenCalledWith(ID, "declined", "admin-1");
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      "admin-1",
      "decline_subscription_request",
      ID,
      {},
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/requests");
  });

  it("rejects a malformed id", async () => {
    expect(await declineRequestAction({ requestId: "x" })).toMatchObject({
      success: false,
    });
    expect(mocks.closeRequest).not.toHaveBeenCalled();
  });

  it("reports a request someone already closed", async () => {
    mocks.closeRequest.mockResolvedValue(false);
    expect(await declineRequestAction({ requestId: ID })).toMatchObject({
      success: false,
    });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("returns an error when the write fails", async () => {
    mocks.closeRequest.mockRejectedValue(new Error("db down"));
    expect(await declineRequestAction({ requestId: ID })).toMatchObject({
      success: false,
    });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });
});
