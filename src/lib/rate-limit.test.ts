import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({ rpc }),
}));

import { clientIp, rateLimit } from "./rate-limit";

const OPTS = {
  bucket: "waitlist",
  key: "203.0.113.9",
  limit: 5,
  windowSeconds: 3600,
};

beforeEach(() => {
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("clientIp", () => {
  it("prefers x-vercel-forwarded-for over everything else", () => {
    const h = new Headers({
      "x-vercel-forwarded-for": "198.51.100.1",
      "x-real-ip": "198.51.100.2",
      "x-forwarded-for": "198.51.100.3",
    });
    expect(clientIp(h)).toBe("198.51.100.1");
  });

  it("falls back to x-real-ip before x-forwarded-for", () => {
    const h = new Headers({
      "x-real-ip": "198.51.100.2",
      "x-forwarded-for": "198.51.100.3",
    });
    expect(clientIp(h)).toBe("198.51.100.2");
  });

  it("uses the last x-forwarded-for hop, never the spoofable first", () => {
    const h = new Headers({
      "x-forwarded-for": "1.2.3.4, 10.0.0.1, 203.0.113.9",
    });
    expect(clientIp(h)).toBe("203.0.113.9");
  });

  it('returns "unknown" with no headers', () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("caps an oversized value at 64 characters", () => {
    const h = new Headers({ "x-real-ip": "a".repeat(200) });
    expect(clientIp(h)).toHaveLength(64);
  });
});

describe("rateLimit", () => {
  it("passes a namespaced key, limit and window to the counter", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await rateLimit({ ...OPTS, failOpen: true });
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
      p_key: "waitlist:203.0.113.9",
      p_limit: 5,
      p_window_seconds: 3600,
    });
  });

  it("returns false when the limit is hit", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await rateLimit({ ...OPTS, failOpen: true })).toBe(false);
  });

  it("fails open on a counter error when failOpen is set", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await rateLimit({ ...OPTS, failOpen: true })).toBe(true);
  });

  it("fails closed on a counter error when failOpen is unset", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await rateLimit({ ...OPTS, failOpen: false })).toBe(false);
  });

  it("honours failOpen when the client throws", async () => {
    rpc.mockRejectedValue(new Error("network"));
    expect(await rateLimit({ ...OPTS, failOpen: true })).toBe(true);
    expect(await rateLimit({ ...OPTS, failOpen: false })).toBe(false);
  });
});
