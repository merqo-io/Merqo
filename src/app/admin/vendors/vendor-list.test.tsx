// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { VendorList } from "./vendor-list";

describe("VendorList empty state", () => {
  it("explains where vendors show up when there are none", () => {
    render(<VendorList grants={[]} products={[]} />);
    expect(
      screen.getByText("No vendors yet. Approved requests show up here."),
    ).toBeInTheDocument();
  });
});
