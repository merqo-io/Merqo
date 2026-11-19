// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("VendorList search", () => {
  it("clears the filter with a touch tap on the clear button", async () => {
    const user = userEvent.setup();
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
    const input = screen.getByLabelText("Search by email");
    await user.type(input, "zzz");
    expect(
      screen.getByText("No vendors match these filters."),
    ).toBeInTheDocument();
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Clear search" }),
    });
    expect(input).toHaveValue("");
    expect(screen.getByText("a@business.sg")).toBeInTheDocument();
  });
});
