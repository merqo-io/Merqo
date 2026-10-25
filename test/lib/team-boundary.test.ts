import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  getAal: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(path);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => {
  const eq = () => ({ maybeSingle: mocks.maybeSingle });
  const select = () => ({ eq });
  const from = () => ({ select });
  return {
    createServerClient: async () => ({
      auth: {
        getUser: mocks.getUser,
        mfa: { getAuthenticatorAssuranceLevel: mocks.getAal },
      },
      from,
    }),
  };
});
import { requireMerqoTeam, requireTeamMember } from "@/lib/team";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "operator" } } });
  mocks.maybeSingle.mockResolvedValue({
    data: { user_id: "operator" },
    error: null,
  });
  mocks.getAal.mockResolvedValue({
    data: { currentLevel: "aal2", nextLevel: "aal2" },
    error: null,
  });
});
it("returns a signed-in team member", async () => {
  await expect(requireMerqoTeam()).resolves.toEqual({
    user: { id: "operator" },
  });
});
it("redirects a missing session before querying membership", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  await expect(requireMerqoTeam()).rejects.toThrow("/login");
  expect(mocks.maybeSingle).not.toHaveBeenCalled();
});
it("treats auth outages as signed out", async () => {
  mocks.getUser.mockRejectedValue(new Error("outage"));
  await expect(requireMerqoTeam()).rejects.toThrow("/login");
});
it("denies a signed-in nonmember", async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(requireMerqoTeam()).rejects.toThrow("/no-access");
});
it("surfaces membership configuration errors", async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: null,
    error: { message: "schema unavailable" },
  });
  await expect(requireMerqoTeam()).rejects.toThrow("merqo_team read failed");
});

it("rejects returned auth errors even with stale user data", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "operator" } },
    error: { message: "expired" },
  });
  await expect(requireMerqoTeam()).rejects.toThrow("/login");
  expect(mocks.maybeSingle).not.toHaveBeenCalled();
});

it("sends a password-only (aal1) team member to the MFA page", async () => {
  mocks.getAal.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal2" },
    error: null,
  });
  await expect(requireMerqoTeam()).rejects.toThrow("/mfa");
});

it("sends a team member with no factor enrolled to the MFA page", async () => {
  mocks.getAal.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  });
  await expect(requireMerqoTeam()).rejects.toThrow("/mfa");
});

it("fails closed when the assurance level cannot be read", async () => {
  mocks.getAal.mockResolvedValue({ data: null, error: { message: "down" } });
  await expect(requireMerqoTeam()).rejects.toThrow("/mfa");
});

it("keeps non-members on /no-access before any MFA prompt", async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(requireMerqoTeam()).rejects.toThrow("/no-access");
  expect(mocks.getAal).not.toHaveBeenCalled();
});

it("lets the MFA page check membership without requiring aal2", async () => {
  mocks.getAal.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal2" },
    error: null,
  });
  await expect(requireTeamMember()).resolves.toEqual({
    user: { id: "operator" },
  });
});
