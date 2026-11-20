// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Providers } from "./providers";

const mocks = vi.hoisted(() => ({
  component: vi.fn(),
}));

vi.mock("sonner", () => ({ Toaster: () => null }));
vi.mock("next/link", () => ({ default: "next-link-stub" }));
vi.mock("@merqo/ui", () => ({
  AppLinkProvider: ({
    component,
    children,
  }: {
    component: unknown;
    children: React.ReactNode;
  }) => {
    mocks.component(component);
    return <div data-testid="link-provider">{children}</div>;
  },
}));

describe("Providers", () => {
  it("mounts AppLinkProvider with next/link around the children", () => {
    render(
      <Providers>
        <p>child</p>
      </Providers>,
    );
    expect(screen.getByTestId("link-provider")).toContainElement(
      screen.getByText("child"),
    );
    expect(mocks.component).toHaveBeenCalledWith("next-link-stub");
  });
});
