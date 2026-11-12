// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./error";

afterEach(() => vi.restoreAllMocks());

describe("root error boundary", () => {
  it("shows the copy, retries on tap and quotes the digest", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<ErrorBoundary error={error} reset={reset} />);

    expect(screen.getByText("That didn't load")).toBeTruthy();
    expect(
      screen.getByText("Something went wrong on our side. Try again."),
    ).toBeTruthy();
    expect(screen.getByText("Reference: abc123")).toBeTruthy();

    const user = userEvent.setup();
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Try again" }),
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("omits the reference line when Next gives no digest", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary error={new Error("boom")} reset={() => {}} />);
    expect(screen.queryByText(/Reference:/)).toBeNull();
  });
});
