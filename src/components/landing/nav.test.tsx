// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Nav, navAccount } from "./nav";

vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("@/app/actions/feedback", () => ({ submitFeedbackAction: vi.fn() }));
vi.mock("@/app/actions/support", () => ({
  submitSupportMessageAction: vi.fn(),
}));

describe("Nav", () => {
  it("renders the sticky header matching qkit's px-5 py-4 sizing", () => {
    render(<Nav />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("px-5", "py-4", "backdrop-blur-md");
    expect(screen.getByText("Merqo home")).toBeInTheDocument();
  });

  it("links to the About page", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
  });

  it("links to the /faq page", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute(
      "href",
      "/faq",
    );
  });

  it("sends a signed-in vendor through /post-login, not straight to /admin", () => {
    render(<Nav authed />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/post-login",
    );
  });

  it("sends a signed-out visitor to /login", () => {
    render(<Nav authed={false} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("Nav account menu", () => {
  it("shows a Dashboard link and an account menu, not Sign in, when authed", () => {
    render(<Nav authed account={{ name: "Ana" }} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("opens the menu by touch and offers Sign out", async () => {
    const user = userEvent.setup();
    render(<Nav authed account={{ name: "Ana" }} />);
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Account menu" }),
    });
    expect(
      await screen.findByRole("menuitem", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("falls back to a generic account label without an account", () => {
    render(<Nav authed />);
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
  });

  it("has no menu when signed out", () => {
    render(<Nav />);
    expect(screen.queryByRole("menuitem")).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("navAccount", () => {
  it("is undefined for a signed-out visitor", () => {
    expect(navAccount(null)).toBeUndefined();
  });

  it("prefers the display name and reads the avatar", () => {
    expect(
      navAccount({
        email: "a@b.co",
        user_metadata: { display_name: "Ana", avatar_url: "https://x/a.png" },
      }),
    ).toEqual({ name: "Ana", avatarUrl: "https://x/a.png" });
  });

  it("falls back to the email, then a generic label", () => {
    expect(navAccount({ email: "a@b.co" })).toEqual({
      name: "a@b.co",
      avatarUrl: undefined,
    });
    expect(navAccount({})?.name).toBe("Account");
  });
});

describe("Nav at phone width", () => {
  it("hides Kits and FAQ below sm so the avatar stays inside 375px", () => {
    render(<Nav authed account={{ name: "Ana" }} />);
    for (const name of ["Kits", "FAQ"]) {
      expect(screen.getByRole("link", { name })).toHaveClass(
        "hidden",
        "sm:inline-flex",
      );
    }
    expect(screen.getByRole("link", { name: "About" })).not.toHaveClass(
      "hidden",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
  });
});
