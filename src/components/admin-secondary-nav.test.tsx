// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminSecondaryNav } from "./admin-secondary-nav";

const mocks = vi.hoisted(() => ({ pathname: vi.fn(() => "/admin/team") }));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname() }));
// dashboard-nav is imported for isActive; stub its server-action imports.
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("@/app/actions/feedback", () => ({ submitFeedbackAction: vi.fn() }));
vi.mock("@/app/actions/support", () => ({
  submitSupportMessageAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const LINKS = [
  { href: "/admin/team", label: "Team" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/activity", label: "Activity" },
];

describe("AdminSecondaryNav", () => {
  it("marks only the current page with aria-current", () => {
    mocks.pathname.mockReturnValue("/admin/team");
    render(<AdminSecondaryNav links={LINKS} />);
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Feedback" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Activity" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps the cue on nested routes", () => {
    mocks.pathname.mockReturnValue("/admin/feedback/42");
    render(<AdminSecondaryNav links={LINKS} />);
    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
