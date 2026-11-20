// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mintVendorTelegramConnectToken,
  disconnectVendorTelegram,
  refresh,
  toastError,
} = vi.hoisted(() => ({
  mintVendorTelegramConnectToken: vi.fn(),
  disconnectVendorTelegram: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("./vendor-telegram-actions", () => ({
  mintVendorTelegramConnectToken,
  disconnectVendorTelegram,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }));

import { VendorTelegramConnect } from "./vendor-telegram-connect";

// The kit asks for confirmation before disconnecting; tap through it by touch.
async function confirmDisconnect() {
  const user = userEvent.setup();
  await user.pointer({
    keys: "[TouchA]",
    target: screen.getByRole("button", { name: /disconnect/i }),
  });
  const dialog = await screen.findByRole("alertdialog");
  await user.pointer({
    keys: "[TouchA]",
    target: within(dialog).getByRole("button", { name: "Disconnect" }),
  });
}

describe("VendorTelegramConnect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disconnected: connecting mints a token and renders the deep link", async () => {
    mintVendorTelegramConnectToken.mockResolvedValue({
      success: true,
      deepLink: "https://t.me/MerqoNotifyBot?start=abc123",
      qrSvgMarkup: "<svg data-testid='qr' />",
    });
    render(<VendorTelegramConnect connected={false} />);

    fireEvent.click(screen.getByRole("button", { name: /connect telegram/i }));

    expect(
      await screen.findByRole("img", { name: /telegram connect qr code/i }),
    ).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
    expect(
      screen.getByRole("link", { name: /t\.me\/MerqoNotifyBot/ }),
    ).toHaveAttribute("href", "https://t.me/MerqoNotifyBot?start=abc123");
  });

  it("disconnected: a mint failure toasts a plain error, renders no link", async () => {
    mintVendorTelegramConnectToken.mockResolvedValue({
      success: false,
      error: "Telegram isn't set up yet",
    });
    render(<VendorTelegramConnect connected={false} />);

    fireEvent.click(screen.getByRole("button", { name: /connect telegram/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Could not create a Telegram link. Try again.",
      );
    });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("connected: disconnecting calls the action and refreshes on success", async () => {
    disconnectVendorTelegram.mockResolvedValue({ success: true });
    render(<VendorTelegramConnect connected={true} />);

    await confirmDisconnect();

    await waitFor(() => {
      expect(disconnectVendorTelegram).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("connected: a disconnect failure toasts a plain error without refreshing", async () => {
    disconnectVendorTelegram.mockResolvedValue({
      success: false,
      error: "Could not disconnect Telegram",
    });
    render(<VendorTelegramConnect connected={true} />);

    await confirmDisconnect();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Could not disconnect Telegram. Try again.",
      );
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
