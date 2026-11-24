import { beforeEach, describe, expect, it, vi } from "vitest";

const runTrialSweep = vi.hoisted(() => vi.fn());
vi.mock("@/lib/entitlements/trial-start", () => ({ runTrialSweep }));

import { GET } from "./route";

const call = (authorization?: string) =>
  GET(
    new Request("https://merqo.test/api/cron/trials", {
      headers: authorization ? { authorization } : {},
    }),
  );

describe("GET /api/cron/trials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "s3cret");
    runTrialSweep.mockResolvedValue({ checked: 2, started: 1 });
  });

  it("rejects a request with no bearer token", async () => {
    expect((await call()).status).toBe(401);
    expect(runTrialSweep).not.toHaveBeenCalled();
  });

  it("rejects the wrong secret", async () => {
    expect((await call("Bearer nope")).status).toBe(401);
    expect(runTrialSweep).not.toHaveBeenCalled();
  });

  it("rejects everything when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    expect(runTrialSweep).not.toHaveBeenCalled();
  });

  it("runs the sweep for the right secret", async () => {
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checked: 2, started: 1 });
  });

  it("reports a failed sweep as 500", async () => {
    runTrialSweep.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await call("Bearer s3cret")).status).toBe(500);
  });
});
