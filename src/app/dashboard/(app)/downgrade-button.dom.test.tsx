// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { requestDowngrade } from "@/app/actions/downgrade";
import { DowngradeButton } from "./downgrade-button";

vi.mock("@/app/actions/downgrade", () => ({ requestDowngrade: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

async function openAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Request cancellation" }),
  );
  await user.click(screen.getByRole("button", { name: "Send request" }));
}

it("shows the sent message after the request succeeds", async () => {
  vi.mocked(requestDowngrade).mockResolvedValue({ success: true });
  const user = userEvent.setup();
  render(<DowngradeButton slug="qkit" />);
  await openAndConfirm(user);
  expect(requestDowngrade).toHaveBeenCalledWith("qkit");
  expect(
    await screen.findByText("Request sent, we'll confirm shortly."),
  ).toBeInTheDocument();
});

it("keeps the dialog open with the returned error inline", async () => {
  vi.mocked(requestDowngrade).mockResolvedValue({
    success: false,
    error: "Please sign in first.",
  });
  const user = userEvent.setup();
  render(<DowngradeButton slug="qkit" />);
  await openAndConfirm(user);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please sign in first.",
  );
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});

it("shows the thrown message when the request rejects", async () => {
  vi.mocked(requestDowngrade).mockRejectedValue(new Error("Network down"));
  const user = userEvent.setup();
  render(<DowngradeButton slug="qkit" />);
  await openAndConfirm(user);
  expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
});
