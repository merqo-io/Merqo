// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFoundPage from "./not-found";

describe("root not-found page", () => {
  it("shows the 404 copy and a link home", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByText("Not found")).toBeTruthy();
    expect(
      screen.getByText(
        "This page does not exist, or you do not have access to it.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Back to home" }).getAttribute("href"),
    ).toBe("/");
  });
});
