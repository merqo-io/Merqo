// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AdminLoading from "./admin/loading";
import TeamLoading from "./admin/team/loading";
import VendorsLoading from "./admin/vendors/loading";
import DashboardLoading from "./dashboard/(app)/loading";

describe.each([
  ["admin", AdminLoading],
  ["team", TeamLoading],
  ["vendors", VendorsLoading],
  ["dashboard", DashboardLoading],
])("%s loading skeleton", (_name, Component) => {
  it("is a busy status region with a screen-reader label", () => {
    render(<Component />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading");
    expect(region.querySelector(".sr-only")).toBeInTheDocument();
  });

  it("disables pulsing under reduced motion", () => {
    const { container } = render(<Component />);
    const pulsing = container.querySelectorAll(".animate-pulse");
    expect(pulsing.length).toBeGreaterThan(0);
    pulsing.forEach((el) =>
      expect(el.className).toContain("motion-reduce:animate-none"),
    );
  });
});
