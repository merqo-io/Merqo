import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import {
  loadTrialCandidates,
  loadVendorTrial,
  markTrialChecked,
  overrideTrial,
  setTrialUen,
  startTrial,
} from "./trial-store";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createServiceClient.mockResolvedValue({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      upsert: mocks.upsert,
    }),
    rpc: mocks.rpc,
  });
});

describe("loadVendorTrial", () => {
  it("maps a row", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "t1",
        status: "active",
        started_at: "s",
        ends_at: "e",
        first_order_at: "f",
        paynow_uen: "U",
        override_reason: null,
      },
      error: null,
    });
    expect(await loadVendorTrial("v1")).toEqual({
      id: "t1",
      status: "active",
      startedAt: "s",
      endsAt: "e",
      firstOrderAt: "f",
      paynowUen: "U",
      overrideReason: null,
    });
  });

  it("returns null when there is no row", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await loadVendorTrial("v1")).toBeNull();
  });

  it("throws on a read error", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "x" },
    });
    await expect(loadVendorTrial("v1")).rejects.toThrow("trial read: x");
  });
});

describe("rpc wrappers", () => {
  it("startTrial returns the status", async () => {
    mocks.rpc.mockResolvedValue({ data: "active", error: null });
    const status = await startTrial({
      vendorId: "v",
      emailNormalized: "a@b.c",
      firstOrderAt: "2026-01-01T00:00:00Z",
      paynowUen: null,
    });
    expect(status).toBe("active");
    expect(mocks.rpc).toHaveBeenCalledWith("start_trial", {
      p_vendor_id: "v",
      p_email: "a@b.c",
      p_first_order_at: "2026-01-01T00:00:00Z",
      p_paynow_uen: null,
    });
  });

  it("startTrial throws on error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(
      startTrial({
        vendorId: "v",
        emailNormalized: "a",
        firstOrderAt: "f",
        paynowUen: null,
      }),
    ).rejects.toThrow("trial start: boom");
  });

  it("setTrialUen returns the status or null", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "blocked", error: null });
    expect(await setTrialUen("v", "U1")).toBe("blocked");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await setTrialUen("v", "U1")).toBeNull();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "e" } });
    await expect(setTrialUen("v", "U1")).rejects.toThrow("trial uen: e");
  });

  it("overrideTrial passes the reason and surfaces errors", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "overridden", error: null });
    const input = {
      vendorId: "v",
      emailNormalized: "a",
      adminId: "adm",
      reason: "why",
      paynowUen: null,
    };
    expect(await overrideTrial(input)).toBe("overridden");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "override_trial",
      expect.objectContaining({ p_reason: "why", p_admin: "adm" }),
    );
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "e" } });
    await expect(overrideTrial(input)).rejects.toThrow("trial override: e");
  });

  it("loadTrialCandidates maps rows and handles empty data", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ vendor_id: "v1", email: "a@b.c" }],
      error: null,
    });
    expect(await loadTrialCandidates(25)).toEqual([
      { vendorId: "v1", email: "a@b.c" },
    ]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await loadTrialCandidates(25)).toEqual([]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "e" } });
    await expect(loadTrialCandidates(25)).rejects.toThrow(
      "trial candidates: e",
    );
  });
});

describe("markTrialChecked", () => {
  it("upserts and swallows a failure", async () => {
    mocks.upsert.mockResolvedValueOnce({ error: null });
    await markTrialChecked("v1");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.upsert.mockResolvedValueOnce({ error: { message: "e" } });
    await markTrialChecked("v1");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
