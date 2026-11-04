// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { VendorList } from "./vendor-list";

describe("VendorList empty state", () => {
  it("explains where vendors show up when there are none", () => {
    render(<VendorList grants={[]} products={[]} />);
    expect(
      screen.getByText("No vendors yet. Approved requests show up here."),
    ).toBeInTheDocument();
  });

  it("says no vendors match when filters exclude every vendor", () => {
    render(
      <VendorList
        grants={[
          {
            email: "a@business.sg",
            kits: [{ slug: "qkit", name: "qkit", status: "active" }],
          },
        ]}
        products={[{ slug: "qkit", name: "qkit" }]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Search by email"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("No vendors match these filters."),
    ).toBeInTheDocument();
  });
});
