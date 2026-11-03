import { describe, it, expect, vi, beforeEach } from "vitest";

const { addToWaitlistMock } = vi.hoisted(() => ({
  addToWaitlistMock: vi.fn(),
}));
vi.mock("@/lib/waitlist", () => ({ addToWaitlist: addToWaitlistMock }));

import { joinKitWaitlist } from "@/app/actions/waitlist";
import { WAITLIST_IDLE } from "@/lib/waitlist-state";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("joinKitWaitlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts a normalized email for a valid in-build kit and reports success", async () => {
    addToWaitlistMock.mockResolvedValue(undefined);
    const res = await joinKitWaitlist(
      WAITLIST_IDLE,
      form({ email: "  Vendor@Example.COM ", slug: "loopkit" }),
    );
    expect(addToWaitlistMock).toHaveBeenCalledWith(
      "vendor@example.com",
      "loopkit",
      false,
    );
    expect(res.status).toBe("success");
  });

  it("rejects an invalid email without touching the DB", async () => {
    const res = await joinKitWaitlist(
      WAITLIST_IDLE,
      form({ email: "not-an-email", slug: "loopkit" }),
    );
    expect(res.status).toBe("error");
    expect(addToWaitlistMock).not.toHaveBeenCalled();
  });

  it("rejects a slug that is not an open waitlist (e.g. a piloting kit)", async () => {
    const res = await joinKitWaitlist(
      WAITLIST_IDLE,
      form({ email: "v@x.com", slug: "qkit" }),
    );
    expect(res.status).toBe("error");
    expect(addToWaitlistMock).not.toHaveBeenCalled();
  });

  it("surfaces a friendly error when the upsert throws", async () => {
    addToWaitlistMock.mockRejectedValue(new Error("db down"));
    const res = await joinKitWaitlist(
      WAITLIST_IDLE,
      form({ email: "v@x.com", slug: "loopkit" }),
    );
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/try again/i);
  });

  it("passes updatesOptIn=true only when the box is ticked", async () => {
    addToWaitlistMock.mockResolvedValue(undefined);
    await joinKitWaitlist(
      WAITLIST_IDLE,
      form({ email: "v@x.com", slug: "loopkit", updatesOptIn: "on" }),
    );
    expect(addToWaitlistMock).toHaveBeenCalledWith("v@x.com", "loopkit", true);
  });

  it("rejects an unexpected checkbox value", async () => {
    const res = await joinKitWaitlist(
      WAITLIST_IDLE,
      form({ email: "v@x.com", slug: "loopkit", updatesOptIn: "yes" }),
    );
    expect(res.status).toBe("error");
    expect(addToWaitlistMock).not.toHaveBeenCalled();
  });
});
