import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadVendorContext: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/lib/vendor", () => ({
  loadVendorContext: mocks.loadVendorContext,
  hasActiveLinkFor: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requestUpgrade } from "@/app/actions/upgrade";
import { requestDowngrade } from "@/app/actions/downgrade";

beforeEach(() => vi.clearAllMocks());

describe.each([
  ["requestUpgrade", requestUpgrade],
  ["requestDowngrade", requestDowngrade],
])("%s", (_name, action) => {
  it("rejects a malformed slug before touching the vendor context", async () => {
    const result = await action("Not A Slug; drop");
    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mocks.loadVendorContext).not.toHaveBeenCalled();
  });
});
