// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const { requireMerqoTeamMock, listTeamMembersMock } = vi.hoisted(() => ({
  requireMerqoTeamMock: vi.fn(),
  listTeamMembersMock: vi.fn(),
}));

vi.mock("@/lib/team", () => ({ requireMerqoTeam: requireMerqoTeamMock }));
vi.mock("@/lib/admin", () => ({ listTeamMembers: listTeamMembersMock }));
vi.mock("./add-team-form", () => ({ AddTeamForm: () => null }));
vi.mock("./remove-member", () => ({ RemoveMember: () => null }));

import TeamPage, { metadata } from "./page";

describe("TeamPage", () => {
  it("renders the shared header", async () => {
    requireMerqoTeamMock.mockResolvedValue({ user: { id: "u1" } });
    listTeamMembersMock.mockResolvedValue([]);

    render(await TeamPage());

    expect(metadata.title).toBe("Team");
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Team" }),
    ).toBeInTheDocument();
  });
});
