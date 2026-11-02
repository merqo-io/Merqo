import { describe, expect, it } from "vitest";
import {
  statusLabel,
  subscriptionPeriodLine,
  syncFailureLabel,
} from "./subscription-labels";

describe("syncFailureLabel", () => {
  it("names a parse or schema failure even when the kit answered 200", () => {
    expect(
      syncFailureLabel({ lastErrorKind: "schema", lastHttpStatus: 200 }),
    ).toBe("response not understood (HTTP 200)");
    expect(
      syncFailureLabel({ lastErrorKind: "parse", lastHttpStatus: 200 }),
    ).toBe("response not understood (HTTP 200)");
  });

  it("distinguishes a missing route from other HTTP errors", () => {
    expect(
      syncFailureLabel({ lastErrorKind: "http", lastHttpStatus: 404 }),
    ).toBe("route missing (HTTP 404)");
    expect(
      syncFailureLabel({ lastErrorKind: "http", lastHttpStatus: 500 }),
    ).toBe("kit returned an error (HTTP 500)");
  });

  it("labels a network failure", () => {
    expect(
      syncFailureLabel({ lastErrorKind: "network", lastHttpStatus: null }),
    ).toBe("network error or timed out");
  });

  it("falls back to the HTTP code for rows without a kind", () => {
    expect(syncFailureLabel({ lastErrorKind: null, lastHttpStatus: 404 })).toBe(
      "HTTP 404",
    );
    expect(
      syncFailureLabel({ lastErrorKind: null, lastHttpStatus: null }),
    ).toBeNull();
  });
});

describe("statusLabel", () => {
  it("shows one spelling for both stored cancel values", () => {
    expect(statusLabel("canceled")).toBe("Cancelled");
    expect(statusLabel("cancelled")).toBe("Cancelled");
    expect(statusLabel("active")).toBe("active");
  });
});

describe("subscriptionPeriodLine", () => {
  const days = { start: "2026-11-02", end: "2026-12-02" };
  const now = Date.parse("2026-11-10T00:00:00Z");

  it("offers the renew hint only on an active row", () => {
    expect(
      subscriptionPeriodLine(
        { status: "active", currentPeriodEnd: "2026-12-02T00:00:00Z" },
        now,
        days,
      ),
    ).toBe(
      "Period 2026-11-02 to 2026-12-02. Ends 2026-12-02; renew by granting again.",
    );
  });

  it("describes a canceled row as past", () => {
    expect(
      subscriptionPeriodLine(
        { status: "canceled", currentPeriodEnd: "2026-12-02T00:00:00Z" },
        now,
        days,
      ),
    ).toBe("Cancelled. Period was 2026-11-02 to 2026-12-02.");
  });

  it("describes a lapsed active row as past but renewable", () => {
    expect(
      subscriptionPeriodLine(
        { status: "active", currentPeriodEnd: "2026-11-05T00:00:00Z" },
        now,
        days,
      ),
    ).toBe(
      "Lapsed. Period was 2026-11-02 to 2026-12-02; renew by granting again.",
    );
  });
});
