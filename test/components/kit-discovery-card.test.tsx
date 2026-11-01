// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KitDiscoveryCard } from "@/components/dashboard/kit-discovery-card";

const qkit = {
  slug: "qkit",
  name: "qkit",
  tagline: "Take orders and run your queue.",
  description: "Take orders and run your queue from a QR code.",
  features: ["QR ordering", "Live dashboard", "No app needed"],
  status: "piloting" as const,
  href: "https://qkit.merqo.io",
};

const loopkit = {
  slug: "loopkit",
  name: "loopkit",
  tagline: "Stamp cards.",
  description: "Digital stamp cards that bring customers back.",
  features: ["Stamp cards", "Points", "Rewards"],
  status: "in-build" as const,
  href: "https://loopkit.merqo.io",
};

describe("KitDiscoveryCard", () => {
  it("renders the kit name, description, and first feature", () => {
    render(<KitDiscoveryCard kit={qkit} />);
    expect(screen.getByText("qkit")).toBeInTheDocument();
    expect(
      screen.getByText("Take orders and run your queue from a QR code."),
    ).toBeInTheDocument();
    expect(screen.getByText("QR ordering")).toBeInTheDocument();
  });

  it("renders the illustrated preview for a kit that has one", () => {
    render(<KitDiscoveryCard kit={qkit} />);
    expect(screen.getByText("Now serving")).toBeInTheDocument();
  });

  it("renders no preview for a kit without one", () => {
    render(<KitDiscoveryCard kit={loopkit} />);
    expect(screen.queryByText("Now serving")).not.toBeInTheDocument();
  });

  it("renders the cta slot when provided", () => {
    render(<KitDiscoveryCard kit={qkit} cta={<button>Add qkit</button>} />);
    expect(
      screen.getByRole("button", { name: "Add qkit" }),
    ).toBeInTheDocument();
  });

  it("renders no cta when the slot is omitted", () => {
    render(<KitDiscoveryCard kit={loopkit} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
