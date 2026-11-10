// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProfileLoading from "./loading";

describe("ProfileLoading", () => {
  it("announces loading and matches the real page's content width", () => {
    const { container } = render(<ProfileLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading")).toHaveClass("sr-only");
    expect(container.querySelector(".max-w-lg")).toBeInTheDocument();
  });
});
