// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./subscription-actions", () => ({
  grantSubscriptionAction: vi.fn(),
  cancelSubscriptionAction: vi.fn(),
  mintEventPassAction: vi.fn(),
  cancelEventPassAction: vi.fn(),
  repushEntitlementsAction: vi.fn(),
  settleEventPassAction: vi.fn(),
}));

import type { SubscriptionRow } from "@/lib/entitlements/store";
import { SubscriptionSection } from "./subscription-section";

const terms = {
  perCupCents: 15,
  minCents: 1400,
  capCents: 2800,
  durationDays: 2,
};
const NOW = Date.parse("2026-12-10T00:00:00Z");

const pass = (over: Record<string, unknown> = {}) => ({
  id: "pass-1",
  startsAt: "2026-12-01T00:00:00Z",
  endsAt: "2026-12-03T00:00:00Z",
  prepaidCents: 1400,
  status: "active",
  settledCups: null,
  settledCents: null,
  settledAt: null,
  ...over,
});

function renderWith(
  eventPasses: ReturnType<typeof pass>[],
  passUsage: Record<string, { ok: true; cups: number } | { ok: false }>,
  nowMs = NOW,
  founder: {
    number: number | null;
    subscriptions: SubscriptionRow[];
  } = { number: null, subscriptions: [] },
) {
  render(
    <SubscriptionSection
      email="v@x.com"
      subscriptions={founder.subscriptions}
      eventPasses={eventPasses}
      syncRows={[]}
      plans={[]}
      eventTerms={terms}
      passUsage={passUsage}
      founderCount={0}
      founderNumber={founder.number}
      today="2026-12-10"
      request={null}
      nowMs={nowMs}
    />,
  );
}

describe("event pass settle view", () => {
  it("shows cups, total, prepaid, top-up and an enabled settle button for an ended pass", () => {
    renderWith([pass()], { "pass-1": { ok: true, cups: 150 } });
    expect(
      screen.getByText(
        "150 cups, total S$22.50, S$14.00 prepaid, top-up due S$8.50",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /event pass for v@x.com settled/ }),
    ).toBeEnabled();
  });

  it("caps the total at the pass cap", () => {
    renderWith([pass()], { "pass-1": { ok: true, cups: 5000 } });
    expect(
      screen.getByText(/total S\$28.00, S\$14.00 prepaid, top-up due S\$14.00/),
    ).toBeInTheDocument();
  });

  it("disables settle and says so when usage is unavailable", () => {
    renderWith([pass()], { "pass-1": { ok: false } });
    expect(screen.getByText(/Usage unavailable/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /event pass for v@x.com settled/ }),
    ).toBeDisabled();
  });

  it("shows only running cups while the pass is in progress", () => {
    renderWith(
      [pass()],
      { "pass-1": { ok: true, cups: 42 } },
      Date.parse("2026-12-02T00:00:00Z"),
    );
    expect(screen.getByText("42 cups so far")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /settled/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the recorded figures, not a live read, once settled", () => {
    renderWith(
      [
        pass({
          status: "settled",
          settledCups: 120,
          settledCents: 400,
          settledAt: "2026-12-05T04:00:00Z",
        }),
      ],
      {},
    );
    expect(screen.getByText("Settled")).toBeInTheDocument();
    expect(
      screen.getByText(/120 cups, top-up S\$4.00 \(S\$14.00 prepaid\)/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /settled/ }),
    ).not.toBeInTheDocument();
  });

  it("shows no usage line for a cancelled pass", () => {
    renderWith([pass({ status: "cancelled" })], {});
    expect(screen.queryByText(/cups/)).not.toBeInTheDocument();
  });
});

describe("founder badge", () => {
  const founderSub: SubscriptionRow = {
    id: "sub-1",
    planSlug: "qkit",
    interval: "year",
    status: "active",
    currentPeriodStart: "2026-12-01T00:00:00Z",
    currentPeriodEnd: "2027-12-01T00:00:00Z",
    renewalAnchor: "2027-12-01T00:00:00Z",
    lockedPriceCents: 19900,
    includedKits: ["qkit"],
    source: "admin_manual",
    founder: true,
    founderUntil: "2027-12-01T00:00:00Z",
  };

  it("shows the zero-padded founder number", () => {
    renderWith([], {}, NOW, { number: 3, subscriptions: [founderSub] });
    expect(screen.getByText(/Founder #03 until/)).toBeInTheDocument();
  });

  it("keeps the number after the benefits end", () => {
    renderWith([], {}, NOW, {
      number: 12,
      subscriptions: [{ ...founderSub, founderUntil: "2026-12-05T00:00:00Z" }],
    });
    expect(
      screen.getByText("Founder #12 (benefits ended)"),
    ).toBeInTheDocument();
  });

  it("falls back to plain Founder with no number", () => {
    renderWith([], {}, NOW, { number: null, subscriptions: [founderSub] });
    expect(screen.getByText(/^Founder until/)).toBeInTheDocument();
  });
});
