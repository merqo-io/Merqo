import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  fromMock,
  createServiceClientMock,
  requireMerqoTeamMock,
  revalidatePathMock,
  recordAuditMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  createServiceClientMock: vi.fn(),
  requireMerqoTeamMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  recordAuditMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: createServiceClientMock,
}));
vi.mock("@/lib/team", () => ({
  requireMerqoTeam: requireMerqoTeamMock,
}));
vi.mock("@/lib/admin", () => ({
  recordAudit: recordAuditMock,
}));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { resolveSupportMessageAction } from "./actions";

describe("resolveSupportMessageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMerqoTeamMock.mockResolvedValue({ user: { id: "u1" } });
  });

  it("resolves a message for a team member", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ update: () => ({ eq: eqMock }) });
    createServiceClientMock.mockResolvedValue({ from: fromMock });

    const res = await resolveSupportMessageAction("msg-1");

    expect(res).toEqual({ success: true });
    expect(eqMock).toHaveBeenCalledWith("id", "msg-1");
    expect(recordAuditMock).toHaveBeenCalledWith(
      "u1",
      "resolve_support_message",
      "msg-1",
      null,
    );
  });
});
