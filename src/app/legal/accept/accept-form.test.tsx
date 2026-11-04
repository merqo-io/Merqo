// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AcceptForm } from "./accept-form";

vi.mock("./actions", () => ({ acceptLegalTerms: vi.fn() }));

const mocks = vi.hoisted(() => ({ signOutAction: vi.fn(async () => {}) }));
vi.mock("@/app/actions/auth", () => ({ signOutAction: mocks.signOutAction }));

describe("AcceptForm", () => {
  it("carries the redirect target in a hidden field and disables submit until agreed", async () => {
    render(<AcceptForm next="/admin" />);

    const nextField = document.querySelector('input[name="next"]');
    expect(nextField).toHaveValue("/admin");

    const submit = screen.getByRole("button", { name: "Continue" });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox"));

    expect(submit).toBeEnabled();
  });

  it("explains the disabled Continue button via aria-describedby", async () => {
    render(<AcceptForm next="/admin" />);
    const submit = screen.getByRole("button", { name: "Continue" });
    expect(submit).toHaveAccessibleDescription(
      "Tick the box above to continue.",
    );

    await userEvent.click(screen.getByRole("checkbox"));
    expect(submit).not.toHaveAttribute("aria-describedby");
  });

  it("offers a Sign out button wired to signOutAction", async () => {
    render(<AcceptForm next="/admin" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mocks.signOutAction).toHaveBeenCalledTimes(1);
  });
});
