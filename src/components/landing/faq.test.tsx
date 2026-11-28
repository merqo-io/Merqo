// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Faq, FAQ } from "./faq";

describe("Faq", () => {
  it("has three rows and links to the full FAQ", () => {
    render(<Faq />);
    expect(FAQ).toHaveLength(3);
    for (const row of FAQ) {
      expect(screen.getByText(row.q)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("link", { name: "More questions" }),
    ).toHaveAttribute("href", "/faq");
  });
});
