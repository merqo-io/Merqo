// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("./actions", () => ({ setBillingOpensAtAction: mocks.action }));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

import { BillingOpenForm } from "./billing-form";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.action.mockResolvedValue({ success: true });
});

describe("BillingOpenForm", () => {
  it("saves the chosen date", async () => {
    const user = userEvent.setup();
    render(<BillingOpenForm current={null} />);
    await user.type(screen.getByLabelText("Billing opens on"), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Save date" }));
    await waitFor(() =>
      expect(mocks.action).toHaveBeenCalledWith({ date: "2026-12-01" }),
    );
    expect(mocks.success).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Clear date" })).toBeNull();
  });

  it("clears an existing date", async () => {
    const user = userEvent.setup();
    render(<BillingOpenForm current="2026-12-01" />);
    expect(screen.getByLabelText("Billing opens on")).toHaveValue("2026-12-01");
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    await waitFor(() =>
      expect(mocks.action).toHaveBeenCalledWith({ date: null }),
    );
  });

  it("shows the error when saving fails", async () => {
    mocks.action.mockResolvedValue({ success: false, error: "nope" });
    const user = userEvent.setup();
    render(<BillingOpenForm current="2026-12-01" />);
    await user.click(screen.getByRole("button", { name: "Save date" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("nope"));
  });
});
