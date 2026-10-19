// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const { requireMerqoTeamMock, hasActiveVendorAccessMock, getAvatarUrlMock } =
  vi.hoisted(() => ({
    requireMerqoTeamMock: vi.fn(),
    hasActiveVendorAccessMock: vi.fn(),
    getAvatarUrlMock: vi.fn(),
  }));

vi.mock("@/lib/team", () => ({
  requireMerqoTeam: requireMerqoTeamMock,
}));
vi.mock("@/lib/vendor", () => ({
  hasActiveVendorAccess: hasActiveVendorAccessMock,
}));
vi.mock("@/lib/account", () => ({
  getAvatarUrl: getAvatarUrlMock,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

describe("AdminLayout", () => {
  beforeEach(() => {
    requireMerqoTeamMock.mockReset();
    hasActiveVendorAccessMock.mockReset();
    getAvatarUrlMock.mockReset().mockReturnValue(null);
  });

  it("renders the shared nav with every admin section and a footer without a sign-in link", async () => {
    requireMerqoTeamMock.mockResolvedValue({
      user: { email: "team@merqo.io", user_metadata: {} },
    });
    hasActiveVendorAccessMock.mockResolvedValue(false);

    const { default: AdminLayout } = await import("./layout");
    render(await AdminLayout({ children: <div>page content</div> }));

    for (const [label, href] of [
      ["Overview", "/admin"],
      ["Vendors", "/admin/vendors"],
      ["Products", "/admin/products"],
      ["Team", "/admin/team"],
      ["Feedback", "/admin/feedback"],
      ["Activity", "/admin/activity"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }
    expect(
      screen.getByRole("link", { name: "merqo admin home" }),
    ).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in →" }),
    ).not.toBeInTheDocument();
  });

  it("threads the signed-in user's email/avatar and an active-vendor canSwitch into the nav, and renders children", async () => {
    requireMerqoTeamMock.mockResolvedValue({
      user: { email: "team@merqo.io", user_metadata: {} },
    });
    hasActiveVendorAccessMock.mockResolvedValue(true);
    getAvatarUrlMock.mockReturnValue("https://x.supabase.co/avatar.png");

    const { default: AdminLayout } = await import("./layout");
    const { getByText, container } = render(
      await AdminLayout({ children: <div>page content</div> }),
    );

    expect(hasActiveVendorAccessMock).toHaveBeenCalledWith("team@merqo.io");
    expect(getByText("page content")).toBeInTheDocument();
    expect(getByText("team@merqo.io")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://x.supabase.co/avatar.png",
    );
  });

  it("skips the active-vendor-access lookup and forces canSwitch=false when the user has no email", async () => {
    requireMerqoTeamMock.mockResolvedValue({
      user: { email: null, user_metadata: {} },
    });

    const { default: AdminLayout } = await import("./layout");
    const { getByText } = render(
      await AdminLayout({ children: <div>page content</div> }),
    );

    expect(hasActiveVendorAccessMock).not.toHaveBeenCalled();
    expect(getByText("page content")).toBeInTheDocument();
    // No email means AccountMenu's trigger falls back to the "•" initials
    // placeholder instead of rendering an email span.
    expect(getByText("•")).toBeInTheDocument();
  });
});
