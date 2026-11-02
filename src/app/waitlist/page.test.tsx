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

  it("lists only in-build kits and shows the consent copy", async () => {
    await selected("stockkit");
    const options = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(["", "loopkit", "paykit", "stockkit"]);
    expect(
      screen.getByText("Clarence may email you about this kit."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
