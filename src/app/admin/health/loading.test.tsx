// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HealthLoading from "./loading";

describe("HealthLoading", () => {
  it("renders a max-w-7xl skeleton matching the real page's content width", () => {
    const { container } = render(<HealthLoading />);
    expect(container.querySelector("main.max-w-7xl")).toBeInTheDocument();
  });
});
