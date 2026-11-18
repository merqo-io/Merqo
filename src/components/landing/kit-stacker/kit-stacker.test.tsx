// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KitStacker } from "./kit-stacker";
import { ModuleList } from "./module-list";

describe("ModuleList touch", () => {
  it("gives the add/remove toggle a 44px hit area", () => {
    render(
      <ModuleList
        stacked={new Set(["qkit"])}
        onToggle={() => {}}
        onHighlight={() => {}}
      />,
    );
    const toggle = screen.getAllByRole("button")[0];
    expect(toggle.className).toMatch(/\bsize-11\b/);
  });

  it("highlights a kit on tap, without hover", async () => {
    const user = userEvent.setup();
    render(<KitStacker />);
    const row = screen.getByText("Add paykit to the stack").closest("li")!;
    expect(row).not.toHaveAttribute("data-highlighted");
    await user.pointer({ keys: "[TouchA]", target: row });
    expect(row).toHaveAttribute("data-highlighted", "true");
  });

  it("highlights a kit on keyboard focus", async () => {
    const user = userEvent.setup();
    render(<KitStacker />);
    const row = screen.getByText("Add paykit to the stack").closest("li")!;
    await user.tab();
    while (!row.contains(document.activeElement)) await user.tab();
    expect(row).toHaveAttribute("data-highlighted", "true");
  });
});
