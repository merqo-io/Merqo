// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

vi.mock("next/link", () => ({
  default: (p: React.ComponentProps<"a">) => <a {...p} />,
}));

describe("privacy page", () => {
  it("renders the heading and exactly one home link", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    const home = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/");
    expect(home).toHaveLength(1);
    expect(home[0].querySelector("a")).toBeNull();
  });
});
