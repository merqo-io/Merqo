// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LegalAcceptPage from "./page";

vi.mock("./actions", () => ({ acceptLegalTerms: vi.fn() }));
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn(async () => {}) }));

async function renderPage(next?: string) {
  render(await LegalAcceptPage({ searchParams: Promise.resolve({ next }) }));
}

describe("LegalAcceptPage", () => {
  it("renders the interstitial with a hidden safe-redirect next value", async () => {
    await renderPage("/admin");
    expect(screen.getByText("Our terms have been updated")).toBeInTheDocument();
    expect(document.querySelector('input[name="next"]')).toHaveValue("/admin");
  });

  it("falls back to /dashboard for an unsafe next value", async () => {
    await renderPage("https://evil.example");
    expect(document.querySelector('input[name="next"]')).toHaveValue(
      "/dashboard",
    );
  });

  it("keeps Continue disabled until the box is ticked by touch", async () => {
    await renderPage("/admin");
    const submit = screen.getByRole("button", { name: "Continue" });
    expect(submit).toBeDisabled();
    await userEvent.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("checkbox"),
    });
    expect(submit).toBeEnabled();
  });

  it("offers a Sign out button as a way out", async () => {
    await renderPage("/admin");
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });
});
