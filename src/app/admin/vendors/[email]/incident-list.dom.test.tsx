// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { IncidentList } from "./incident-list";

const NOW = Date.parse("2026-10-29T12:00:00Z");

describe("IncidentList", () => {
  it("renders each kind with a human label, count and relative time", () => {
    render(
      <IncidentList
        now={NOW}
        incidents={[
          {
            kind: "payment_callback_failed",
            count: 3,
            lastAt: "2026-10-29T10:00:00Z",
          },
          { kind: "print_stuck", count: 1, lastAt: "2026-10-29T11:30:00Z" },
        ]}
      />,
    );

    expect(screen.getByText("Incidents (last 72 h)")).toBeInTheDocument();
    expect(screen.getByText("Payment callback failed")).toBeInTheDocument();
    expect(screen.getByText("Print stuck")).toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getByText("2h ago").closest("span")).toHaveTextContent(
      "last 2h ago",
    );
  });

  it("renders the reference id and code for recent incidents", () => {
    render(
      <IncidentList
        now={NOW}
        incidents={[
          { kind: "print_failed", count: 1, lastAt: "2026-10-29T11:00:00Z" },
        ]}
        recent={[
          {
            kind: "print_failed",
            ref: "job_123",
            code: "PRINTER_OFFLINE",
            at: "2026-10-29T11:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("job_123")).toBeInTheDocument();
    expect(screen.getByText("PRINTER_OFFLINE")).toBeInTheDocument();
  });

  it("renders the empty message when incidents are missing", () => {
    render(<IncidentList now={NOW} />);
    expect(
      screen.getByText("No incidents in the last 72 hours"),
    ).toBeInTheDocument();
  });

  it("renders the empty message when incidents are empty", () => {
    render(<IncidentList now={NOW} incidents={[]} recent={[]} />);
    expect(
      screen.getByText("No incidents in the last 72 hours"),
    ).toBeInTheDocument();
  });

  it("shows the exact Singapore time when a relative time is tapped", async () => {
    render(
      <IncidentList
        now={NOW}
        incidents={[
          {
            kind: "print_stuck",
            count: 1,
            lastAt: "2026-10-29T10:00:00Z",
          },
        ]}
      />,
    );

    await userEvent.setup().click(screen.getByText("2h ago"));
    expect(await screen.findByText("29 Oct 2026, 6:00 pm")).toBeInTheDocument();
  });
});
