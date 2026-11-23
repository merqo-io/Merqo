// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./trial-actions", () => ({
  checkFirstOrderAction: vi.fn(),
  setTrialUenAction: vi.fn(),
  overrideTrialAction: vi.fn(),
}));

import type { TrialRow } from "@/lib/entitlements/trial-store";
import { TrialSection } from "./trial-section";

const NOW = Date.parse("2026-11-10T00:00:00Z");
const row = (over: Partial<TrialRow> = {}): TrialRow => ({
  id: "t1",
  status: "active",
  startedAt: "2026-11-01T00:00:00Z",
  endsAt: "2026-11-13T00:00:00Z",
  firstOrderAt: "2026-11-01T00:00:00Z",
  paynowUen: null,
  overrideReason: null,
  ...over,
});

function show(trial: TrialRow | null) {
  render(<TrialSection email="v@x.com" trial={trial} nowMs={NOW} />);
}

describe("TrialSection", () => {
  it("explains when no trial has started", () => {
    show(null);
    expect(screen.getByText(/No trial yet/)).toBeInTheDocument();
    expect(screen.getByText("Check first order now")).toBeInTheDocument();
    expect(screen.getByText("Override and start trial")).toBeInTheDocument();
  });

  it("shows days left and hides the override for a running trial", () => {
    show(row());
    expect(screen.getByText(/3 days left/)).toBeInTheDocument();
    expect(screen.queryByText("Override and start trial")).toBeNull();
  });

  it("shows a blocked trial with the override available", () => {
    show(row({ status: "blocked" }));
    expect(
      screen.getByText(/Blocked: this email or PayNow/),
    ).toBeInTheDocument();
    expect(screen.getByText("Override and start trial")).toBeInTheDocument();
  });

  it("shows an ended trial", () => {
    show(row({ status: "active", endsAt: "2026-11-05T00:00:00Z" }));
    expect(screen.getByText(/^Ended /)).toBeInTheDocument();
  });

  it("shows the override reason", () => {
    show(row({ status: "overridden", overrideReason: "Same owner" }));
    expect(screen.getByText("Override reason: Same owner")).toBeInTheDocument();
  });
});
