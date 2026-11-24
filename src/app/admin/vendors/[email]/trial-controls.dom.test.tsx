// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

const actions = vi.hoisted(() => ({
  checkFirstOrderAction: vi.fn(),
  overrideTrialAction: vi.fn(),
  setTrialUenAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("./trial-actions", () => actions);

import { TrialControls } from "./trial-controls";

beforeEach(() => {
  vi.clearAllMocks();
  actions.checkFirstOrderAction.mockResolvedValue({
    success: true,
    message: "Trial recorded.",
  });
  actions.setTrialUenAction.mockResolvedValue({
    success: true,
    message: "PayNow/UEN saved.",
  });
  actions.overrideTrialAction.mockResolvedValue({ success: true });
});

function renderControls(paynowUen: string | null, canOverride = true) {
  render(
    <TrialControls
      email="a@b.co"
      paynowUen={paynowUen}
      canOverride={canOverride}
    />,
  );
}

it("checks the first order without a UEN when the field is blank", async () => {
  renderControls(null);
  await userEvent.click(
    screen.getByRole("button", { name: "Check first order now" }),
  );
  await waitFor(() =>
    expect(actions.checkFirstOrderAction).toHaveBeenCalledWith({
      email: "a@b.co",
      paynowUen: undefined,
    }),
  );
  expect(toast.success).toHaveBeenCalledWith("Trial recorded.");
});

it("shows the error when the check fails", async () => {
  actions.checkFirstOrderAction.mockResolvedValue({
    success: false,
    error: "nope",
  });
  renderControls("201912345A");
  await userEvent.click(
    screen.getByRole("button", { name: "Check first order now" }),
  );
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("nope"));
  expect(actions.checkFirstOrderAction).toHaveBeenCalledWith({
    email: "a@b.co",
    paynowUen: "201912345A",
  });
});

it("disables saving while the UEN is blank", () => {
  renderControls(null);
  expect(
    screen.getByRole("button", { name: "Save and re-check" }),
  ).toBeDisabled();
});

it("saves the UEN and reports the result", async () => {
  renderControls("201912345A");
  await userEvent.click(
    screen.getByRole("button", { name: "Save and re-check" }),
  );
  await waitFor(() =>
    expect(actions.setTrialUenAction).toHaveBeenCalledWith({
      email: "a@b.co",
      paynowUen: "201912345A",
    }),
  );
  expect(toast.success).toHaveBeenCalledWith("PayNow/UEN saved.");
});

it("shows the error when saving fails", async () => {
  actions.setTrialUenAction.mockResolvedValue({ success: false, error: "bad" });
  renderControls("201912345A");
  await userEvent.click(
    screen.getByRole("button", { name: "Save and re-check" }),
  );
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("bad"));
});

it("overrides with a reason and clears the field", async () => {
  renderControls(null);
  const reason = screen.getByLabelText("Override reason");
  await userEvent.type(reason, "vendor verified");
  await userEvent.click(
    screen.getByRole("button", { name: "Override and start trial" }),
  );
  await waitFor(() =>
    expect(actions.overrideTrialAction).toHaveBeenCalledWith({
      email: "a@b.co",
      reason: "vendor verified",
      paynowUen: undefined,
    }),
  );
  expect(toast.success).toHaveBeenCalledWith("Trial started");
  await waitFor(() => expect(reason).toHaveValue(""));
});

it("shows the error when the override fails", async () => {
  actions.overrideTrialAction.mockResolvedValue({
    success: false,
    error: "no",
  });
  renderControls(null);
  await userEvent.type(screen.getByLabelText("Override reason"), "abc");
  await userEvent.click(
    screen.getByRole("button", { name: "Override and start trial" }),
  );
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("no"));
});

it("hides the override form without permission", () => {
  renderControls(null, false);
  expect(screen.queryByLabelText("Override reason")).toBeNull();
});
