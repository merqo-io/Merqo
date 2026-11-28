// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PRICING_LINE } from "@/lib/kits";
import { Closing } from "./closing";

describe("Closing", () => {
  it("renders the pricing line and routes sign-in to /login", () => {
    render(<Closing />);
    expect(screen.getByText(PRICING_LINE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("sends a signed-in vendor through /post-login", () => {
    render(<Closing authed />);
    expect(
      screen.getByRole("link", { name: "Go to dashboard" }),
    ).toHaveAttribute("href", "/post-login");
  });
});
