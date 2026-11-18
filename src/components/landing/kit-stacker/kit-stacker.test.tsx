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

describe("highlight by touch", () => {
  async function setup() {
    const user = userEvent.setup();
    const view = render(<KitStacker />);
    const addPaykit = screen.getByRole("button", {
      name: "Add paykit to the stack",
    });
    await user.pointer({ keys: "[TouchA]", target: addPaykit });
    const row = screen.getByText("Remove paykit from the stack").closest("li")!;
    return { user, view, row };
  }

  it("tapping the toggle changes the stack but not the highlight", async () => {
    const { row } = await setup();
    expect(row).not.toHaveAttribute("data-highlighted");
  });

  it("clears the row highlight on a second tap", async () => {
    const { user, row } = await setup();
    await user.pointer({ keys: "[TouchA]", target: row });
    expect(row).toHaveAttribute("data-highlighted", "true");
    await user.pointer({ keys: "[TouchA]", target: row });
    expect(row).not.toHaveAttribute("data-highlighted");
  });

  it("clears the highlight on a tap outside the stacker items", async () => {
    const { user, row } = await setup();
    await user.pointer({ keys: "[TouchA]", target: row });
    await user.pointer({ keys: "[TouchA]", target: document.body });
    expect(row).not.toHaveAttribute("data-highlighted");
  });

  it("highlights a tower block on tap and clears on tap again", async () => {
    const { user } = await setup();
    const block = screen.getByRole("group", { name: "Payments" });
    await user.pointer({ keys: "[TouchA]", target: block });
    expect(block).toHaveAttribute("data-highlighted", "true");
    await user.pointer({ keys: "[TouchA]", target: block });
    expect(block).not.toHaveAttribute("data-highlighted");
  });

  it("highlights a graph node on tap", async () => {
    const { user, view } = await setup();
    const node = view.container.querySelector('g[data-kit-slug="paykit"]')!;
    await user.pointer({ keys: "[TouchA]", target: node });
    expect(node).toHaveAttribute("data-highlighted", "true");
  });

  it("still highlights on mouse hover", async () => {
    const { user, row } = await setup();
    await user.hover(row);
    expect(row).toHaveAttribute("data-highlighted", "true");
    await user.unhover(row);
    expect(row).not.toHaveAttribute("data-highlighted");
  });
});
