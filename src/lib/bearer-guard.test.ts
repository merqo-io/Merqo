import { describe, it, expect, vi, beforeEach } from "vitest";

const customerNotifySecretOk = vi.fn();
vi.mock("@/lib/customer-notify-auth", () => ({
  customerNotifySecretOk: (...args: unknown[]) =>
    customerNotifySecretOk(...args),
}));

const rateLimit = vi.fn();
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: (...args: unknown[]) => rateLimit(...args),
}));

import { guardBearerRoute } from "./bearer-guard";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://merqo.example.com/api/merqo/x", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  rateLimit.mockReset().mockResolvedValue(true);
  customerNotifySecretOk.mockReset().mockReturnValue(true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("guardBearerRoute", () => {
  it("returns null when under the limit with a valid bearer", async () => {
    expect(await guardBearerRoute(req(), "notify-vendor")).toBeNull();
  });

  it("skips the counter but still checks the secret when rateLimited is false", async () => {
    expect(
      await guardBearerRoute(req(), "legal-status", { rateLimited: false }),
    ).toBeNull();
    expect(rateLimit).not.toHaveBeenCalled();
    customerNotifySecretOk.mockReturnValue(false);
    const res = await guardBearerRoute(req(), "legal-status", {
      rateLimited: false,
    });
    expect(res?.status).toBe(401);
  });

  it("429s when the limit is hit, before checking the secret", async () => {
    rateLimit.mockResolvedValue(false);
    const res = await guardBearerRoute(req(), "notify-vendor");
    expect(res?.status).toBe(429);
    expect(customerNotifySecretOk).not.toHaveBeenCalled();
  });

  it("keys the counter on the trusted IP, per route", async () => {
    await guardBearerRoute(
      req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }),
      "notify-vendor",
    );
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "bearer:notify-vendor",
        key: "203.0.113.9",
        failOpen: true,
      }),
    );
  });

  it("401s and logs the rejection without the supplied secret", async () => {
    customerNotifySecretOk.mockReturnValue(false);
    const res = await guardBearerRoute(
      req({
        authorization: "Bearer super-secret-guess",
        "x-real-ip": "1.1.1.1",
      }),
      "notify-customer",
    );
    expect(res?.status).toBe(401);
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain("notify-customer");
    expect(logged).toContain("1.1.1.1");
    expect(logged).not.toContain("super-secret-guess");
  });
});
