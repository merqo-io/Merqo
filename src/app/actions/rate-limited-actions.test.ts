import { describe, it, expect, vi, beforeEach } from "vitest";

const rateLimit = vi.fn();
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: (...args: unknown[]) => rateLimit(...args),
}));

const headersMock = vi.fn();
vi.mock("next/headers", () => ({ headers: () => headersMock() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const addToWaitlist = vi.fn();
vi.mock("@/lib/waitlist", () => ({
  addToWaitlist: (...args: unknown[]) => addToWaitlist(...args),
}));

const signInWithPassword = vi.fn();
const insert = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: {
      signInWithPassword,
      getUser: async () => ({ data: { user: { id: "u1" } }, error: null }),
    },
    from: () => ({ insert }),
  }),
}));

import { joinKitWaitlist } from "./waitlist";
import { signInWithPasswordAction } from "./auth";
import { submitSupportMessageAction } from "./support";
import { submitFeedbackAction } from "./feedback";

beforeEach(() => {
  vi.clearAllMocks();
  rateLimit.mockResolvedValue(true);
  headersMock.mockResolvedValue(
    new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }),
  );
  signInWithPassword.mockResolvedValue({ error: null });
  insert.mockResolvedValue({ error: null });
  addToWaitlist.mockResolvedValue(undefined);
});

function waitlistForm(): FormData {
  const fd = new FormData();
  fd.set("email", "a@b.sg");
  fd.set("slug", "loopkit");
  return fd;
}

describe("waitlist", () => {
  it("limits per trusted IP and stops before writing when limited", async () => {
    rateLimit.mockResolvedValue(false);
    const res = await joinKitWaitlist(
      { status: "idle" } as never,
      waitlistForm(),
    );
    expect(res.status).toBe("error");
    expect(addToWaitlist).not.toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "waitlist",
        key: "203.0.113.9",
        failOpen: true,
      }),
    );
  });

  it("writes when under the limit", async () => {
    const res = await joinKitWaitlist(
      { status: "idle" } as never,
      waitlistForm(),
    );
    expect(res.status).toBe("success");
  });
});

describe("login", () => {
  it("blocks before touching Supabase Auth when limited", async () => {
    rateLimit.mockResolvedValue(false);
    const res = await signInWithPasswordAction({
      email: "a@b.sg",
      password: "pw",
    });
    expect(res.error).toMatch(/too many/i);
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "login", key: "203.0.113.9" }),
    );
  });

  it("signs in when under the limit", async () => {
    const res = await signInWithPasswordAction({
      email: "a@b.sg",
      password: "pw",
    });
    expect(res.error).toBeNull();
  });
});

describe("support and feedback", () => {
  it("support is limited per user id", async () => {
    rateLimit.mockResolvedValue(false);
    const res = await submitSupportMessageAction({
      category: "other",
      body: "hi",
    });
    expect(res.success).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "support", key: "u1" }),
    );
  });

  it("feedback is limited per user id", async () => {
    rateLimit.mockResolvedValue(false);
    const res = await submitFeedbackAction({ nps: 9 });
    expect(res.success).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "feedback", key: "u1" }),
    );
  });
});
