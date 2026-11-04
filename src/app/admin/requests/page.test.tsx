// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMerqoTeam: vi.fn(),
  listPendingRequests: vi.fn(),
  vendorEmailsById: vi.fn(),
}));
vi.mock("@/lib/team", () => ({ requireMerqoTeam: mocks.requireMerqoTeam }));
vi.mock("@/lib/subscription-requests", () => ({
  listPendingRequests: mocks.listPendingRequests,
  vendorEmailsById: mocks.vendorEmailsById,
}));
vi.mock("./actions", () => ({ declineRequestAction: vi.fn() }));

import RequestsPage from "./page";

const request = {
  id: "11111111-1111-4111-8111-111111111111",
  vendorId: "v1",
  planSlug: "qkit",
  interval: "month",
  kind: "upgrade",
  status: "pending",
  note: "Asked from the qkit card",
  createdAt: "2026-11-02T03:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMerqoTeam.mockResolvedValue({ user: { id: "admin-1" } });
});

describe("RequestsPage", () => {
  it("shows an empty state", async () => {
    mocks.listPendingRequests.mockResolvedValue([]);
    mocks.vendorEmailsById.mockResolvedValue(new Map());
    render(await RequestsPage());
    expect(
      screen.getByRole("heading", { name: "Requests" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No pending requests. Plan changes vendors ask for show up here.",
      ),
    ).toBeInTheDocument();
  });

  it("lists a request with a resolve link to the vendor page and a decline control", async () => {
    mocks.listPendingRequests.mockResolvedValue([request]);
    mocks.vendorEmailsById.mockResolvedValue(
      new Map([["v1", "vendor@business.sg"]]),
    );
    render(await RequestsPage());

    expect(screen.getByText("vendor@business.sg")).toBeInTheDocument();
    expect(screen.getByText("Upgrade")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resolve" })).toHaveAttribute(
      "href",
      `/admin/vendors/vendor%40business.sg?request=${request.id}`,
    );
    expect(
      screen.getByRole("button", {
        name: "Decline the request from vendor@business.sg",
      }),
    ).toBeInTheDocument();
  });

  it("falls back to the vendor id when the email cannot be resolved", async () => {
    mocks.listPendingRequests.mockResolvedValue([request]);
    mocks.vendorEmailsById.mockResolvedValue(new Map([["v1", null]]));
    render(await RequestsPage());
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Resolve" }),
    ).not.toBeInTheDocument();
  });
});
