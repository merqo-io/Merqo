import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertMock, fromMock } = vi.hoisted(() => {
  const upsertMock = vi.fn();
  return {
    upsertMock,
    fromMock: vi.fn((_table: string) => ({ upsert: upsertMock })),
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({ from: fromMock }),
}));

import { addToWaitlist } from "./waitlist";
import { UPDATES_OPT_IN_WORDING } from "./waitlist-consent";

describe("addToWaitlist", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockClear();
  });

  it("stores no consent row when unticked", async () => {
    await addToWaitlist("A@b.co", "paykit");
    expect(fromMock.mock.calls.map((c) => c[0])).toEqual(["vendor_links"]);
  });

  it("upserts the shown wording and clears withdrawal when ticked", async () => {
    await addToWaitlist("A@b.co", "paykit", true);
    expect(fromMock.mock.calls.map((c) => c[0])).toEqual([
      "vendor_links",
      "marketing_consents",
    ]);
    expect(upsertMock).toHaveBeenLastCalledWith(
      {
        email: "a@b.co",
        wording: UPDATES_OPT_IN_WORDING,
        consented_at: expect.any(String),
        withdrawn_at: null,
      },
      { onConflict: "email" },
    );
  });

  it("throws when the consent write fails so the user sees an error", async () => {
    upsertMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(addToWaitlist("a@b.co", "paykit", true)).rejects.toThrow(
      /marketing consent upsert: boom/,
    );
  });
});
