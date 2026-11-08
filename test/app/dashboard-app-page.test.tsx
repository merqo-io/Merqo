// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@merqo/ui/primitives";

const { requireVendorSessionMock, syncVendorKitsMock, listLiveProductsMock } =
  vi.hoisted(() => ({
    requireVendorSessionMock: vi.fn(),
    syncVendorKitsMock: vi.fn(),
    listLiveProductsMock: vi.fn(),
  }));

vi.mock("@/lib/vendor", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/vendor")>("@/lib/vendor");
  return { ...actual, requireVendorSession: requireVendorSessionMock };
});
vi.mock("@/lib/vendor-sync", () => ({ syncVendorKits: syncVendorKitsMock }));
vi.mock("@/lib/products", () => ({ listLiveProducts: listLiveProductsMock }));
vi.mock("@/components/dashboard/activate-kits-button", () => ({
  ActivateKitsButton: ({
    slugs,
    label,
  }: {
    slugs: string[];
    label: string;
  }) => (
    <div data-testid={`activate-kits-button-${slugs.join("-")}`}>{label}</div>
  ),
}));

import DashboardPage from "@/app/dashboard/(app)/page";

describe("DashboardPage — Ready to add kits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("still shows a KitDiscoveryCard for paykit (in build, no provisioning capability), linking to the waitlist instead of an activate button; loopkit gets the activate button", async () => {
    requireVendorSessionMock.mockResolvedValue({
      user: { id: "u1", email: "v@x.com" },
      isTeam: false,
      links: [{ product_slug: "qkit", status: "active", plan: "free" }],
    });
    syncVendorKitsMock.mockResolvedValue([
      { product_slug: "qkit", status: "active", plan: "free" },
    ]);
    // Same real-world drift as the pending-page test: paykit is display-live
    // in kits.ts but has no provision_secret in the live registry.
    listLiveProductsMock.mockResolvedValue([
      {
        slug: "qkit",
        name: "qkit",
        app_url: "https://qkit.vercel.app",
        metrics_url: null,
        metrics_secret: null,
        provision_secret: "p1",
      },
      {
        slug: "loopkit",
        name: "loopkit",
        app_url: "https://loopkit.vercel.app",
        metrics_url: null,
        metrics_secret: null,
        provision_secret: "p2",
      },
      {
        slug: "paykit",
        name: "paykit",
        app_url: "https://paykit.vercel.app",
        metrics_url: null,
        metrics_secret: null,
        provision_secret: null,
      },
    ]);

    const jsx = await DashboardPage();
    render(<TooltipProvider>{jsx}</TooltipProvider>);

    // qkit is already active (linked), so it's never in "ready to add" —
    // loopkit (live + provisionable + not linked) must render its own
    // per-kit activate button.
    expect(
      screen.getByTestId("activate-kits-button-loopkit"),
    ).toBeInTheDocument();

    // paykit is in build and not provisionable, so its card links to the
    // waitlist instead of an activate button or the kit's login.
    expect(
      screen.queryByTestId("activate-kits-button-paykit"),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Join the waitlist" })
        .map((a) => a.getAttribute("href")),
    ).toContain("/waitlist?kit=paykit");
  });

  it("degrades to no provisionable kits (old external links for every ready-to-add kit) when listLiveProducts throws", async () => {
    requireVendorSessionMock.mockResolvedValue({
      user: { id: "u1", email: "v@x.com" },
      isTeam: false,
      links: [],
    });
    syncVendorKitsMock.mockResolvedValue([]);
    listLiveProductsMock.mockRejectedValue(new Error("products read failed"));

    const jsx = await DashboardPage();
    render(jsx);

    // No crash, and since no kit is provisionable, every live kit falls
    // back to the old external login link rather than an activate button.
    expect(screen.queryByTestId(/^activate-kits-button-/)).toBeNull();
    expect(screen.getByRole("link", { name: "Add qkit" })).toBeInTheDocument();
  });
});
