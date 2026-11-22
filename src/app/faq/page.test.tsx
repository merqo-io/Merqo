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

import FaqRoute, { metadata } from "./page";
import { FAQ_GROUPS, FAQ_INTRO, FAQ_TITLE } from "./faq-content";

const allStrings = [
  FAQ_TITLE,
  FAQ_INTRO,
  ...FAQ_GROUPS.flatMap((g) => [
    g.heading ?? "",
    ...g.rows.flatMap((r) => [r.q, r.a]),
  ]),
];

describe("FaqRoute", () => {
  it("renders title, group headings and every question", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { container } = render(await FaqRoute());

    expect(
      screen.getByRole("heading", { level: 1, name: FAQ_TITLE }),
    ).toBeInTheDocument();
    for (const group of FAQ_GROUPS) {
      expect(screen.getByText(group.heading!)).toBeInTheDocument();
      for (const row of group.rows) {
        expect(screen.getByText(row.q)).toBeInTheDocument();
      }
    }
    expect(container.textContent).toContain(
      "No. The plan is one Merqo account and one sign-in across the kits.",
    );
    expect(metadata.title).toBe("FAQ");
  });

  it("has the three groups and ten rows", () => {
    expect(FAQ_GROUPS.map((g) => g.heading)).toEqual([
      "About Merqo",
      "Accounts and kits",
      "Waitlist",
    ]);
    expect(FAQ_GROUPS.flatMap((g) => g.rows)).toHaveLength(10);
  });

  it("emits FAQ JSON-LD and no closing line", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { container } = render(await FaqRoute());
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("legal@merqo.io");
  });

  it("keeps every string within the copy guardrails", () => {
    for (const s of allStrings) {
      expect(s).not.toMatch(/—/);
      expect(s).not.toContain("$");
      expect(s).not.toContain("!");
      expect(s).not.toMatch(/\b(live|proven)\b|now available/i);
    }
  });

  it("shows the dashboard nav CTA for a signed-in vendor", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    render(await FaqRoute());
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/post-login",
    );
  });

  it("labels the nav with the stall name, not the full name", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "vendor@example.com",
          user_metadata: { full_name: "Clarence Lee" },
        },
      },
    });

    render(await FaqRoute());

    expect(screen.getByText("My Stall")).toBeInTheDocument();
    expect(screen.queryByText("Clarence Lee")).not.toBeInTheDocument();
  });
});
