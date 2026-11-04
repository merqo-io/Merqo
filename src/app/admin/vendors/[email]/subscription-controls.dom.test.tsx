// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

const actions = vi.hoisted(() => ({
  grantSubscriptionAction: vi.fn(),
  cancelSubscriptionAction: vi.fn(),
  mintEventPassAction: vi.fn(),
  cancelEventPassAction: vi.fn(),
  repushEntitlementsAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("./subscription-actions", () => actions);

import {
  CancelEventPassButton,
  CancelSubscriptionButton,
  GrantSubscriptionForm,
  MintEventPassForm,
  RepushButton,
} from "./subscription-controls";

const plans = [
  { slug: "qkit", monthlyCents: 1600 },
  { slug: "all_access", monthlyCents: 3600 },
];

beforeEach(() => {
  vi.clearAllMocks();
  actions.grantSubscriptionAction.mockResolvedValue({ success: true });
  actions.cancelSubscriptionAction.mockResolvedValue({ success: true });
  actions.mintEventPassAction.mockResolvedValue({ success: true });
  actions.cancelEventPassAction.mockResolvedValue({ success: true });
});

function grantForm(
  overrides: Partial<Parameters<typeof GrantSubscriptionForm>[0]> = {},
) {
  return (
    <GrantSubscriptionForm
      email="v@x.com"
      plans={plans}
      today="2026-11-02"
      founderSlotsLeft={5}
      current={[]}
      request={null}
      {...overrides}
    />
  );
}

it("submits the catalog price, today's dates and the first plan by default", async () => {
  const user = userEvent.setup();
  render(grantForm());
  expect(screen.getByLabelText("Price charged (S$)")).toHaveValue(16);
  await user.click(screen.getByRole("button", { name: "Save subscription" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  expect(actions.grantSubscriptionAction).toHaveBeenCalledWith({
    email: "v@x.com",
    planSlug: "qkit",
    interval: "month",
    priceCents: 1600,
    periodStart: "2026-11-02",
    renewalAnchor: "2026-11-02",
    founder: false,
    replaceCurrent: true,
    requestId: undefined,
  });
});

it("offers to replace the current plan and sends the choice", async () => {
  const user = userEvent.setup();
  render(grantForm({ current: ["Pro"] }));
  const toggle = screen.getByRole("switch", {
    name: "Replace current plan (Pro)",
  });
  expect(toggle).toBeChecked();
  await user.click(toggle);
  await user.click(screen.getByRole("button", { name: "Save subscription" }));
  await waitFor(() =>
    expect(actions.grantSubscriptionAction).toHaveBeenCalledWith(
      expect.objectContaining({ replaceCurrent: false }),
    ),
  );
});

it("hides the replace switch when the vendor has no active plan", () => {
  render(grantForm());
  expect(screen.queryByRole("switch", { name: /Replace current/ })).toBeNull();
});

it("prefills the plan from a request and sends its id", async () => {
  const user = userEvent.setup();
  render(grantForm({ request: { id: "req-1", planSlug: "all_access" } }));
  expect(screen.getByLabelText("Price charged (S$)")).toHaveValue(36);
  await user.click(screen.getByRole("button", { name: "Save subscription" }));
  await waitFor(() =>
    expect(actions.grantSubscriptionAction).toHaveBeenCalled(),
  );
  expect(actions.grantSubscriptionAction).toHaveBeenCalledWith(
    expect.objectContaining({ planSlug: "all_access", requestId: "req-1" }),
  );
});

it("keeps a hand-edited price and renewal anchor, and sends the founder flag", async () => {
  const user = userEvent.setup();
  render(grantForm());
  const price = screen.getByLabelText("Price charged (S$)");
  await user.clear(price);
  await user.type(price, "12.5");
  const anchor = screen.getByLabelText("Renewal date anchor");
  await user.clear(anchor);
  await user.type(anchor, "2027-01-15");
  await user.click(screen.getByRole("switch"));
  await user.click(screen.getByRole("button", { name: "Save subscription" }));
  await waitFor(() =>
    expect(actions.grantSubscriptionAction).toHaveBeenCalled(),
  );
  expect(actions.grantSubscriptionAction).toHaveBeenCalledWith(
    expect.objectContaining({
      priceCents: 1250,
      renewalAnchor: "2027-01-15",
      founder: true,
    }),
  );
});

it("switches the default price to ten months when billed annually", async () => {
  const user = userEvent.setup();
  render(grantForm());
  await user.click(screen.getByRole("combobox", { name: "Billing interval" }));
  await user.click(screen.getByRole("option", { name: "Annual (ten months)" }));
  expect(screen.getByLabelText("Price charged (S$)")).toHaveValue(160);
});

it("locks the founder switch when no slots are left", () => {
  render(grantForm({ founderSlotsLeft: 0 }));
  expect(screen.getByRole("switch")).toBeDisabled();
});

it("shows the error when granting fails", async () => {
  actions.grantSubscriptionAction.mockResolvedValue({
    success: false,
    error: "All 20 founder slots are taken.",
  });
  const user = userEvent.setup();
  render(grantForm());
  await user.click(screen.getByRole("button", { name: "Save subscription" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("All 20 founder slots are taken."),
  );
});

it("mints a pass from the chosen start date", async () => {
  const user = userEvent.setup();
  render(
    <MintEventPassForm
      email="v@x.com"
      today="2026-11-02"
      minCents={1400}
      durationDays={2}
    />,
  );
  expect(screen.getByText(/Runs 2 days/)).toHaveTextContent("S$14.00");
  await user.click(screen.getByRole("button", { name: "Mint event pass" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  expect(actions.mintEventPassAction).toHaveBeenCalledWith({
    email: "v@x.com",
    startsAt: "2026-11-02",
  });
});

it("shows the error when minting fails", async () => {
  actions.mintEventPassAction.mockResolvedValue({
    success: false,
    error: "No.",
  });
  const user = userEvent.setup();
  render(
    <MintEventPassForm
      email="v@x.com"
      today="2026-11-02"
      minCents={1400}
      durationDays={2}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Mint event pass" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No."));
});

it("confirms before cancelling a subscription and passes the request id", async () => {
  const user = userEvent.setup();
  render(
    <CancelSubscriptionButton
      email="v@x.com"
      subscriptionId="sub-1"
      label="Pro"
      requestId="req-1"
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Cancel Pro for v@x.com" }),
  );
  expect(actions.cancelSubscriptionAction).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancel subscription" }));
  await waitFor(() =>
    expect(actions.cancelSubscriptionAction).toHaveBeenCalledWith({
      email: "v@x.com",
      subscriptionId: "sub-1",
      requestId: "req-1",
    }),
  );
});

it("confirms before cancelling an event pass", async () => {
  const user = userEvent.setup();
  render(<CancelEventPassButton email="v@x.com" passId="pass-1" />);
  await user.click(
    screen.getByRole("button", { name: "Cancel the event pass for v@x.com" }),
  );
  await user.click(screen.getByRole("button", { name: "Cancel pass" }));
  await waitFor(() =>
    expect(actions.cancelEventPassAction).toHaveBeenCalledWith({
      email: "v@x.com",
      passId: "pass-1",
    }),
  );
});

it("reports a clean re-push, a partial one and an error", async () => {
  const user = userEvent.setup();
  render(<RepushButton email="v@x.com" />);
  const button = screen.getByRole("button", { name: "Re-push to kits" });

  actions.repushEntitlementsAction.mockResolvedValueOnce({
    success: true,
    pushed: 3,
    failed: 0,
  });
  await user.click(button);
  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith("Pushed to 3 kits"),
  );

  actions.repushEntitlementsAction.mockResolvedValueOnce({
    success: true,
    pushed: 1,
    failed: 2,
  });
  await user.click(button);
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("2 kits did not accept the push"),
  );

  actions.repushEntitlementsAction.mockResolvedValueOnce({
    success: false,
    error: "Nope",
  });
  await user.click(button);
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Nope"));
});
