// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

const { addTeamMemberActionMock } = vi.hoisted(() => ({
  addTeamMemberActionMock: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("./actions", () => ({ addTeamMemberAction: addTeamMemberActionMock }));

import { AddTeamForm } from "./add-team-form";

beforeEach(() => vi.clearAllMocks());

it("shows the action-specific fallback toast when the error state has no message", async () => {
  addTeamMemberActionMock.mockResolvedValue({ status: "error" });
  const user = userEvent.setup();
  render(<AddTeamForm />);

  await user.type(screen.getByLabelText("Team member email"), "a@merqo.io");
  await user.click(screen.getByRole("button", { name: /add/i }));

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "Could not add that team member. Try again.",
    ),
  );
});
