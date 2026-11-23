// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

const actions = vi.hoisted(() => ({
  pauseSubscriptionAction: vi.fn(),
  endPauseAction: vi.fn(),
  changePlanAction: vi.fn(),
  clearScheduledPlanAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("./lifecycle-actions", () => actions);

import {
  ChangePlanForm,
  ClearScheduledButton,
  EndPauseButton,
  PauseSubscriptionForm,
} from "./lifecycle-controls";

beforeEach(() => {
  vi.clearAllMocks();
  actions.pauseSubscriptionAction.mockResolvedValue({ success: true });
  actions.endPauseAction.mockResolvedValue({ success: true });
  actions.clearScheduledPlanAction.mockResolvedValue({ success: true });
});

describe("PauseSubscriptionForm", () => {
  it("keeps Pause disabled until an end date is set, then submits", async () => {
    render(
      <PauseSubscriptionForm
        email="a@b.co"
        subscriptionId="s1"
        today="2026-11-10"
      />,
    );
    const button = screen.getByRole("button", { name: "Pause" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Back on"), {
      target: { value: "2026-11-20" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "away" },
    });
    await userEvent.click(button);
    await waitFor(() =>
      expect(actions.pauseSubscriptionAction).toHaveBeenCalledWith({
        email: "a@b.co",
        subscriptionId: "s1",
        startsOn: "2026-11-10",
        endsOn: "2026-11-20",
        reason: "away",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Paused until 2026-11-20");
  });

  it("shows the server's reason when the pause is refused", async () => {
    actions.pauseSubscriptionAction.mockResolvedValue({
      success: false,
      error: "That overlaps another pause.",
    });
    render(
      <PauseSubscriptionForm
        email="a@b.co"
        subscriptionId="s1"
        today="2026-11-10"
      />,
    );
    fireEvent.change(screen.getByLabelText("Back on"), {
      target: { value: "2026-11-20" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("That overlaps another pause."),
    );
  });
});

describe("ChangePlanForm", () => {
  const options = [
    { slug: "qkit", label: "Pro", hint: "Upgrades now." },
    { slug: "starter", label: "Starter", hint: "Takes effect at renewal." },
  ];

  it("shows the hint for the chosen plan and announces what to collect", async () => {
    actions.changePlanAction.mockResolvedValue({
      success: true,
      kind: "upgrade",
      owedCents: 250,
      effectiveOn: "2026-11-10T00:00:00Z",
    });
    render(
      <ChangePlanForm email="a@b.co" subscriptionId="s1" options={options} />,
    );
    expect(screen.getByText("Upgrades now.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Change plan" }));
    await waitFor(() =>
      expect(actions.changePlanAction).toHaveBeenCalledWith({
        email: "a@b.co",
        subscriptionId: "s1",
        planSlug: "qkit",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Now on Pro. Collect S$2.50 by PayNow.",
    );
  });

  it("announces a scheduled downgrade with its date", async () => {
    actions.changePlanAction.mockResolvedValue({
      success: true,
      kind: "downgrade",
      owedCents: 0,
      effectiveOn: "2026-12-01T00:00:00Z",
    });
    render(
      <ChangePlanForm
        email="a@b.co"
        subscriptionId="s1"
        options={[options[1]]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Change plan" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/^Changes to Starter on /),
      ),
    );
  });

  it("shows the error when the change is refused and renders nothing without options", async () => {
    actions.changePlanAction.mockResolvedValue({
      success: false,
      error: "nope",
    });
    const { unmount } = render(
      <ChangePlanForm email="a@b.co" subscriptionId="s1" options={options} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Change plan" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("nope"));
    unmount();
    const { container } = render(
      <ChangePlanForm email="a@b.co" subscriptionId="s1" options={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("confirm buttons", () => {
  it("ends a pause after confirming", async () => {
    render(<EndPauseButton email="a@b.co" pauseId="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "End pause" }));
    const confirm = await screen.findAllByRole("button", {
      name: "End pause",
    });
    await userEvent.click(confirm[confirm.length - 1]);
    await waitFor(() =>
      expect(actions.endPauseAction).toHaveBeenCalledWith({
        email: "a@b.co",
        pauseId: "p1",
      }),
    );
  });

  it("drops a scheduled change after confirming", async () => {
    render(<ClearScheduledButton email="a@b.co" subscriptionId="s1" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Keep current plan" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Drop change" }),
    );
    await waitFor(() =>
      expect(actions.clearScheduledPlanAction).toHaveBeenCalledWith({
        email: "a@b.co",
        subscriptionId: "s1",
      }),
    );
  });
});
