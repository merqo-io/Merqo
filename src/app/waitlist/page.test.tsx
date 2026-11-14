// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));
vi.mock("@/components/landing/nav", () => ({ Nav: () => null }));
vi.mock("@/components/landing/footer", () => ({ Footer: () => null }));
vi.mock("@/app/actions/waitlist", () => ({ joinKitWaitlist: vi.fn() }));

import WaitlistPage from "./page";

async function selected(kit?: string | string[]) {
  render(await WaitlistPage({ searchParams: Promise.resolve({ kit }) }));
  return (screen.getByLabelText("Kit") as HTMLSelectElement).value;
}

describe("WaitlistPage", () => {
  it("preselects an in-build kit from ?kit=", async () => {
    expect(await selected("paykit")).toBe("paykit");
  });

  it("preselects nothing for qkit, junk or a missing param", async () => {
    expect(await selected("qkit")).toBe("");
    cleanup();
    expect(await selected("nope")).toBe("");
    cleanup();
    expect(await selected()).toBe("");
  });

  it("preselects the first valid value of a repeated ?kit=", async () => {
    expect(await selected(["loopkit", "paykit"])).toBe("loopkit");
    cleanup();
    expect(await selected(["nope", "paykit"])).toBe("");
  });

  it("lists only in-build kits and shows the consent copy", async () => {
    await selected("stockkit");
    const options = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(["", "loopkit", "paykit", "stockkit"]);
    expect(
      screen.getByText("Clarence may email you about this kit."),
    ).toBeInTheDocument();
  });

  it("shows an unticked, separate general-updates checkbox", async () => {
    await selected("stockkit");
    const box = screen.getByRole("checkbox", {
      name: "Also send me occasional Merqo updates.",
    }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.name).toBe("updatesOptIn");
  });

  it("shows the founding merchant offer without payment details", async () => {
    await selected("stockkit");
    const block = screen
      .getByRole("heading", { name: "Founding merchant offer" })
      .closest("section")!;
    expect(block).toHaveTextContent("If we introduce paid plans");
    expect(block).toHaveTextContent("first 20 founding merchants");
    expect(block).toHaveTextContent("every kit we release");
    expect(block).toHaveTextContent("setup done for them");
    expect(block).toHaveTextContent("does not go up");
    expect(block).toHaveTextContent("Nothing to pay today");
    expect(block).toHaveTextContent("free during the pilot");
    expect(block).not.toHaveTextContent("sole trader");
    expect(block).not.toHaveTextContent("becomes a company");
    expect(block).not.toHaveTextContent("PayNow");
    expect(block).not.toHaveTextContent(/S\$|\$\d/);
  });

  it("keeps the founding offer conditional on paid plans", async () => {
    await selected("stockkit");
    const block = screen
      .getByRole("heading", { name: "Founding merchant offer" })
      .closest("section")!;
    expect(block).not.toHaveTextContent("We have 20 founding merchant spots");
    expect(block).not.toHaveTextContent("before any charge");
  });
});
