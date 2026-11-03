import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), statuses: vi.fn() }));
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.client }));

import { listEntitlementTargets, listLiveProducts } from "@/lib/products";

function stubClient(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  mocks.client.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          mocks.statuses("eq", ...args);
          return Promise.resolve(result);
        },
        in: (...args: unknown[]) => {
          mocks.statuses("in", ...args);
          return Promise.resolve(result);
        },
      }),
    }),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("listLiveProducts", () => {
  it("reads only live rows", async () => {
    stubClient({ data: [{ slug: "qkit" }], error: null });
    expect(await listLiveProducts()).toEqual([{ slug: "qkit" }]);
    expect(mocks.statuses).toHaveBeenCalledWith("eq", "status", "live");
  });
});

describe("listEntitlementTargets", () => {
  it("reads live and push_only rows", async () => {
    stubClient({ data: [{ slug: "qkit" }, { slug: "printkit" }], error: null });
    expect(await listEntitlementTargets()).toHaveLength(2);
    expect(mocks.statuses).toHaveBeenCalledWith("in", "status", [
      "live",
      "push_only",
    ]);
  });

  it("returns an empty list when there are no rows", async () => {
    stubClient({ data: null, error: null });
    expect(await listEntitlementTargets()).toEqual([]);
  });

  it("throws when the read fails", async () => {
    stubClient({ data: null, error: { message: "down" } });
    await expect(listEntitlementTargets()).rejects.toThrow(
      "products read failed: down",
    );
  });
});
