// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { signOut, feedback, support, toastError } = vi.hoisted(() => ({
  signOut: vi.fn(),
  feedback: vi.fn(),
  support: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/app/actions/auth", () => ({ signOutAction: signOut }));
vi.mock("@/app/actions/feedback", () => ({ submitFeedbackAction: feedback }));
vi.mock("@/app/actions/support", () => ({
  submitSupportMessageAction: support,
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import {
  LandingAccountMenu,
  submitFeedback,
  submitHelp,
  reportError,
} from "./account-menu";

beforeEach(() => vi.clearAllMocks());

async function tapSignOut() {
  const user = userEvent.setup();
  render(<LandingAccountMenu name="Ana" />);
  await user.pointer({
    keys: "[TouchA]",
    target: screen.getByRole("button", { name: "Account menu" }),
  });
  const item = await screen.findByRole("menuitem", { name: /sign out/i });
  await user.pointer({ keys: "[TouchA]", target: item });
}

describe("LandingAccountMenu", () => {
  it("runs the sign-out action when Sign out is tapped", async () => {
    signOut.mockResolvedValue(undefined);
    await tapSignOut();
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it("reports a failed sign out instead of swallowing it", async () => {
    signOut.mockRejectedValue(new Error("offline"));
    await tapSignOut();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("offline"));
  });
});

describe("account menu handlers", () => {
  it("sends help with a valid category and falls back to other", async () => {
    support.mockResolvedValue({ success: true });
    await submitHelp({ message: "hi", category: "other" });
    await submitHelp({ message: "hi", category: "nope" });
    await submitHelp({ message: "hi" });
    expect(support).toHaveBeenCalledTimes(3);
    expect(support).toHaveBeenLastCalledWith({ category: "other", body: "hi" });
  });

  it("throws the action error when help fails", async () => {
    support.mockResolvedValue({ success: false, error: "Too many" });
    await expect(submitHelp({ message: "hi" })).rejects.toThrow("Too many");
  });

  it("sends trimmed feedback with a default score", async () => {
    feedback.mockResolvedValue({ success: true });
    await submitFeedback({ message: "  " });
    expect(feedback).toHaveBeenCalledWith({ nps: 0, message: undefined });
    await submitFeedback({ message: " nice ", nps: 9 });
    expect(feedback).toHaveBeenLastCalledWith({ nps: 9, message: "nice" });
  });

  it("throws the action error when feedback fails", async () => {
    feedback.mockResolvedValue({ success: false, error: "Nope" });
    await expect(submitFeedback({ message: "x" })).rejects.toThrow("Nope");
  });

  it("toasts the error message or a generic one", () => {
    reportError(new Error("boom"));
    expect(toastError).toHaveBeenLastCalledWith("boom");
    reportError("x");
    expect(toastError).toHaveBeenLastCalledWith("Something went wrong");
  });
});
