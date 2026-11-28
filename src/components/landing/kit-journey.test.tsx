// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KitJourney } from "./kit-journey";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function stubScroll(top: () => number) {
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ top: top(), height: 300 }) as DOMRect,
  );
}

describe("KitJourney", () => {
  it("tells the story in three steps under the #kits anchor", () => {
    stubReducedMotion(false);
    render(<KitJourney />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(document.getElementById("kits")).not.toBeNull();
  });

  it("adds an in-build kit by touch, with a waitlist link, and Reset clears it", async () => {
    stubReducedMotion(false);
    stubScroll(() => 5000);
    const user = userEvent.setup();
    render(<KitJourney />);
    expect(
      screen.queryByRole("link", { name: "Join the waitlist" }),
    ).toBeNull();

    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Add loopkit" }),
    });
    expect(
      screen.getByRole("link", { name: "Join the waitlist" }),
    ).toHaveAttribute("href", "/waitlist?kit=loopkit");
    expect(screen.queryByRole("button", { name: "Add loopkit" })).toBeNull();

    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Reset" }),
    });
    expect(
      screen.queryByRole("link", { name: "Join the waitlist" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Add loopkit" })).toBeVisible();
  });

  it("reduced motion shows the complete stack and Reset hands the buttons back", async () => {
    stubReducedMotion(true);
    const user = userEvent.setup();
    render(<KitJourney />);
    expect(
      screen.getAllByRole("link", { name: "Join the waitlist" }),
    ).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /^Add / })).toBeNull();

    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Reset" }),
    });
    expect(screen.getAllByRole("button", { name: /^Add / })).toHaveLength(4);
  });

  it("labels qkit Piloting and every other kit In build, never live", () => {
    stubReducedMotion(true);
    render(<KitJourney />);
    expect(screen.getAllByText("Piloting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In build").length).toBeGreaterThan(0);
    expect(screen.queryByText(/\blive\b/i)).toBeNull();
  });
});
