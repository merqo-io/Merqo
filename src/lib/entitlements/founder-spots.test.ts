import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));

import { getFounderSpotsLeft } from "./founder-spots";

beforeEach(() => vi.clearAllMocks());

describe("getFounderSpotsLeft", () => {
  it("returns the count from the rpc", async () => {
    mocks.rpc.mockResolvedValue({ data: 12, error: null });
    expect(await getFounderSpotsLeft()).toBe(12);
    expect(mocks.rpc).toHaveBeenCalledWith("founder_spots_left");
  });

  it("returns null on an rpc error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "missing" } });
    expect(await getFounderSpotsLeft()).toBeNull();
  });

  it("returns null when the reply is not a number", async () => {
    mocks.rpc.mockResolvedValue({ data: "x", error: null });
    expect(await getFounderSpotsLeft()).toBeNull();
  });
});
