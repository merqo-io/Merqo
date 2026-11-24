// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn().mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { stall_name: "My Stall" },
            error: null,
          }),
        }),
      }),
    }),
  }),
  createServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => getUser() },
  }),
}));

import WhichPlanPage, { metadata } from "./page";
import {
  PLAN_COVERS,
  PLAN_NAMES,
  PLAN_ROWS,
  FOUNDER_SPOTS_NOTE,
  PAID_TERMS,
  PAID_TERMS_HEADING,
  WHICH_PLAN_INTRO,
  WHICH_PLAN_TITLE,
} from "./which-plan-content";

const allStrings = [
  WHICH_PLAN_TITLE,
  WHICH_PLAN_INTRO,
  ...PLAN_ROWS.flatMap((r) => [r.vendor, r.plan, r.why]),
  ...PLAN_COVERS.flatMap((c) => [c.plan, c.covers]),
  PAID_TERMS_HEADING,
  FOUNDER_SPOTS_NOTE,
  ...PAID_TERMS,
];

describe("WhichPlanPage", () => {
  it("renders the title, conditional intro and the five vendor rows", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(await WhichPlanPage());

    expect(
      screen.getByRole("heading", { level: 1, name: WHICH_PLAN_TITLE }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Merqo is free during the pilot\./),
    ).toBeInTheDocument();
    expect(PLAN_ROWS).toHaveLength(5);
    for (const row of PLAN_ROWS) {
      expect(screen.getByText(row.vendor)).toBeInTheDocument();
    }
    expect(metadata.title).toBe("Which plan fits you");
  });

  it("uses only the agreed plan names", () => {
    for (const row of PLAN_ROWS) {
      expect([...PLAN_NAMES, "Talk to us"]).toContain(row.plan);
    }
    for (const s of allStrings) {
      expect(s).not.toMatch(/Counter|Market Pack/);
    }
  });

  it("keeps every string within the copy guardrails", () => {
    for (const s of allStrings) {
      expect(s).not.toMatch(/[—–]/);
      expect(s).not.toContain("$");
      expect(s).not.toContain("!");
      const withoutKeptPrice = s.replace("your price are kept", "");
      expect(withoutKeptPrice).not.toMatch(
        /\bprices?\b|per month|\/mo\b|upgrade now/i,
      );
      expect(s).not.toMatch(/\b(live|proven)\b|now available/i);
    }
  });

  it("renders the conditional paid-plan terms with no amounts", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { container } = render(await WhichPlanPage());
    expect(
      screen.getByRole("heading", { level: 2, name: PAID_TERMS_HEADING }),
    ).toBeInTheDocument();
    for (const t of PAID_TERMS) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("link", { name: FOUNDER_SPOTS_NOTE }),
    ).toHaveAttribute("href", "/waitlist");
    expect(container.textContent).toContain("recorded by hand");
    expect(container.textContent).not.toContain("S$");
    expect(container.textContent).not.toContain("$");
  });

  it("shows the waitlist CTA signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { container } = render(await WhichPlanPage());
    expect(
      screen.getByRole("link", { name: "Join the waitlist" }),
    ).toHaveAttribute("href", "/waitlist");
    expect(container.textContent).not.toContain("$");
  });

  it("shows the dashboard CTA signed in", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    render(await WhichPlanPage());
    expect(
      screen.queryByRole("link", { name: "Join the waitlist" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Dashboard" }).length,
    ).toBeGreaterThan(0);
  });
});
