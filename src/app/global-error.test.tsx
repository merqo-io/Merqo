// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GlobalErrorBoundary from "./global-error";

describe("global error boundary", () => {
  it("shows the copy and retries on tap", async () => {
    const reset = vi.fn();
    render(<GlobalErrorBoundary error={new Error("boom")} reset={reset} />, {
      container: document,
    });
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(
      screen.getByText(/An unexpected error interrupted the console\./),
    ).toBeTruthy();
    const user = userEvent.setup();
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Try again" }),
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
