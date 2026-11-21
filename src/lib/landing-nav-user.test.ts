import { beforeEach, describe, expect, it, vi } from "vitest";

const { maybeSingle, eq, select, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { maybeSingle, eq, select, from };
});

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn().mockResolvedValue({ from }),
}));

import { getLandingNavUser } from "./landing-nav-user";

const user = {
  id: "u1",
  email: "vendor@example.com",
  user_metadata: { full_name: "Clarence Lee" },
};

describe("getLandingNavUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for a signed-out visitor without querying", async () => {
    expect(await getLandingNavUser(null)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("labels the nav with the stall name the dashboard shows", async () => {
    maybeSingle.mockResolvedValue({
      data: { stall_name: "My Stall" },
      error: null,
    });

    const nav = await getLandingNavUser(user);

    expect(nav?.name).toBe("My Stall");
    expect(from).toHaveBeenCalledWith("vendor_profile");
    expect(select).toHaveBeenCalledWith("stall_name");
    expect(eq).toHaveBeenCalledWith("vendor_id", "u1");
  });

  it("falls back to the full name when there is no profile row", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    expect((await getLandingNavUser(user))?.name).toBe("Clarence Lee");
  });

  it("falls back to the full name when the read errors", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });

    expect((await getLandingNavUser(user))?.name).toBe("Clarence Lee");
  });

  it("falls back to the full name when the read throws", async () => {
    maybeSingle.mockRejectedValue(new Error("network"));

    expect((await getLandingNavUser(user))?.name).toBe("Clarence Lee");
  });
});
