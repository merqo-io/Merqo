// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SubscriptionRow } from "@/lib/entitlements/store";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("./lifecycle-actions", () => ({
  pauseSubscriptionAction: vi.fn(),
  endPauseAction: vi.fn(),
  changePlanAction: vi.fn(),
  clearScheduledPlanAction: vi.fn(),
}));

import {
  SubscriptionLifecycle,
  lifecycleBadge,
} from "./subscription-lifecycle";

const DAY = 86_400_000;
const END = Date.parse("2026-12-01T00:00:00Z");

const sub = (extra: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  id: "s1",
  planSlug: "starter",
  interval: "month",
  status: "active",
  currentPeriodStart: "2026-11-01T00:00:00Z",
  currentPeriodEnd: "2026-12-01T00:00:00Z",
  renewalAnchor: "2026-11-01T00:00:00Z",
  lockedPriceCents: 1490,
  includedKits: ["qkit"],
  source: "admin_manual",
  founder: false,
  founderUntil: null,
  scheduledPlanSlug: null,
  pauses: [],
  ...extra,
});

const plans = [
  { slug: "starter", label: "Starter", monthlyCents: 1490 },
  { slug: "qkit", label: "Pro", monthlyCents: 1990 },
] as unknown as Parameters<typeof SubscriptionLifecycle>[0]["plans"];

describe("lifecycleBadge", () => {
  it("shows nothing for a healthy subscription and closed rows", () => {
    expect(lifecycleBadge(sub(), END - DAY)).toBeNull();
    expect(
      lifecycleBadge(sub({ status: "canceled" }), END + 30 * DAY),
    ).toBeNull();
  });

  it("counts the grace days left", () => {
    expect(lifecycleBadge(sub(), END + 2.5 * DAY)?.label).toBe(
      "Grace: 5 days left",
    );
    expect(lifecycleBadge(sub(), END + 6.5 * DAY)?.label).toBe(
      "Grace: 1 day left",
    );
  });

  it("marks a lapsed subscription after the grace week", () => {
    expect(lifecycleBadge(sub(), END + 9 * DAY)?.label).toBe("Lapsed");
  });

  it("shows the pause end date", () => {
    const paused = sub({
      pauses: [
        { id: "p1", startsOn: "2026-11-10", endsOn: "2026-11-20", reason: "" },
      ],
    });
    expect(
      lifecycleBadge(paused, Date.parse("2026-11-15T00:00:00Z"))?.label,
    ).toBe("Paused until 2026-11-20");
  });
});

describe("SubscriptionLifecycle", () => {
  const props = {
    email: "a@b.co",
    plans,
    today: "2026-11-10",
    nowMs: Date.parse("2026-11-10T00:00:00Z"),
  };

  it("renders nothing for closed or self-renewing subscriptions", () => {
    const closed = render(
      <SubscriptionLifecycle {...props} sub={sub({ status: "canceled" })} />,
    );
    expect(closed.container).toBeEmptyDOMElement();
    closed.unmount();
    const other = render(
      <SubscriptionLifecycle {...props} sub={sub({ source: "stripe" })} />,
    );
    expect(other.container).toBeEmptyDOMElement();
  });

  it("offers a pause and a plan change with the owed amount hint", () => {
    render(<SubscriptionLifecycle {...props} sub={sub()} />);
    expect(
      screen.getByRole("form", { name: "Pause subscription" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Change plan" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Upgrades now\. Collect S\$/)).toBeInTheDocument();
    expect(screen.getByText(/billing date stays/)).toBeInTheDocument();
  });

  it("shows the scheduled change and the open pauses, hiding ended ones", () => {
    render(
      <SubscriptionLifecycle
        {...props}
        sub={sub({
          scheduledPlanSlug: "starter",
          pauses: [
            {
              id: "p1",
              startsOn: "2026-11-12",
              endsOn: "2026-11-20",
              reason: "away",
            },
            {
              id: "p2",
              startsOn: "2026-10-01",
              endsOn: "2026-10-05",
              reason: "",
            },
          ],
        })}
      />,
    );
    expect(screen.getByText(/Changes to Starter on/)).toBeInTheDocument();
    expect(
      screen.getByText(/Pause 2026-11-12 to 2026-11-20/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/2026-10-01/)).toBeNull();
  });

  it("points founders at the grant form instead of the plan change", () => {
    render(<SubscriptionLifecycle {...props} sub={sub({ founder: true })} />);
    expect(screen.getByText(/Founder subscription/)).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Change plan" })).toBeNull();
  });
});
