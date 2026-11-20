// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Nav } from "./nav";

const accountNavProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock("@merqo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@merqo/ui")>();
  return {
    ...actual,
    LandingAccountNav: (props: Record<string, unknown>) => {
      accountNavProps.current = props;
      const Real = actual.LandingAccountNav as unknown as React.ComponentType<
        Record<string, unknown>
      >;
      return <Real {...props} />;
    },
  };
});

vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("@/app/actions/feedback", () => ({ submitFeedbackAction: vi.fn() }));
vi.mock("@/app/actions/support", () => ({
  submitSupportMessageAction: vi.fn(),
}));

const ana = { name: "Ana", email: "ana@example.com" };

describe("Nav", () => {
  it("renders the sticky header matching qkit's px-5 py-4 sizing", () => {
    render(<Nav />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("py-4", "backdrop-blur-md");
    expect(header.querySelector("nav")).toHaveClass("px-5");
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
    render(<Nav user={ana} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/post-login",
    );
  });

  it("sends a signed-out visitor to /login", () => {
    render(<Nav user={null} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("Nav account menu", () => {
  it("passes no LinkComponent: next/link is a plain function in a Server Component and cannot cross to the client", () => {
    render(<Nav user={ana} />);
    expect(accountNavProps.current).not.toBeNull();
    expect(accountNavProps.current?.LinkComponent).toBeUndefined();
  });

  it("shows a Dashboard link and an account menu, not Sign in, when signed in", () => {
    render(<Nav user={ana} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("opens the menu by touch and offers Sign out", async () => {
    const user = userEvent.setup();
    render(<Nav user={ana} />);
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Account menu" }),
    });
    expect(
      await screen.findByRole("menuitem", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("has no menu when signed out", () => {
    render(<Nav />);
    expect(screen.queryByRole("button", { name: "Account menu" })).toBeNull();
    expect(screen.queryByRole("menuitem")).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("Nav at phone width", () => {
  it("hides Kits and FAQ below sm so the avatar stays inside 375px", () => {
    render(<Nav user={ana} />);
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
