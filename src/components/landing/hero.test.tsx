// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Hero } from "./hero";

describe("Hero", () => {
  it("sends a signed-out visitor to /login", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("sends a signed-in vendor through /post-login, not straight to /admin", () => {
    render(<Hero authed />);
    expect(
      screen.getByRole("link", { name: /go to dashboard/i }),
    ).toHaveAttribute("href", "/post-login");
  });
});

describe("Hero kit switcher", () => {
  it("server-renders qkit as Piloting", () => {
    render(<Hero />);
    expect(screen.getByRole("tab", { name: "Take orders" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Piloting");
  });

  it("switches to an in-build kit by touch and shows In build", async () => {
    const user = userEvent.setup();
    render(<Hero />);
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("tab", { name: "Get paid" }),
    });
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("paykit");
    expect(panel).toHaveTextContent("In build");
    expect(panel).not.toHaveTextContent("Piloting");
  });

  it("has no trust strip", () => {
    render(<Hero />);
    expect(screen.queryByText("No hardware")).toBeNull();
  });
});
