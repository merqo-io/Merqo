// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MfaLoading from "./loading";

describe("MfaLoading", () => {
  it("announces loading and centres a card skeleton like the real page", () => {
    const { container } = render(<MfaLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading")).toHaveClass("sr-only");
    expect(
      container.querySelector("main.min-h-screen .max-w-md"),
    ).toBeInTheDocument();
  });
});
