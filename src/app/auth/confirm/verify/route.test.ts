import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { verifyOtp } }),
}));
import { POST } from "./route";

const post = (fields: Record<string, string>, headers: HeadersInit = {}) =>
  POST(
    new Request("https://merqo.io/auth/confirm/verify", {
      method: "POST",
      headers: { origin: "https://merqo.io", ...headers },
      body: new URLSearchParams(fields),
    }),
  );
const location = (r: Response) => r.headers.get("location");

beforeEach(() => {
  vi.clearAllMocks();
  verifyOtp.mockResolvedValue({ data: {}, error: null });
});

describe("auth confirm verify", () => {
  it("lands a magic link on /post-login", async () => {
    const res = await post({ token_hash: "abc", type: "magiclink" });
    expect(location(res)).toBe("https://merqo.io/post-login");
    expect(verifyOtp).toHaveBeenCalledOnce();
  });

  it("sends a recovery link to /reset-password", async () => {
    const res = await post({ token_hash: "abc", type: "recovery" });
    expect(location(res)).toBe("https://merqo.io/reset-password");
  });

  it("follows a same-origin next", async () => {
    const res = await post({
      token_hash: "abc",
      type: "signup",
      next: "/dashboard",
    });
    expect(location(res)).toBe("https://merqo.io/dashboard");
  });

  it("sends a failed verification to /login?error=link", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: "expired" } });
    const res = await post({ token_hash: "abc", type: "recovery" });
    expect(location(res)).toBe("https://merqo.io/login?error=link");
  });

  it("rejects a cross-origin POST without verifying", async () => {
    const res = await post(
      { token_hash: "abc", type: "recovery" },
      { origin: "https://evil.example" },
    );
    expect(location(res)).toBe("https://merqo.io/login?error=link");
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
