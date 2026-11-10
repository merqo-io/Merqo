// @vitest-environment jsdom
import { expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Wordmark } from "./wordmark";

it("renders the lowercase mark with a gold q", () => {
  const { container } = render(<Wordmark />);
  const root = container.firstElementChild as HTMLElement;
  expect(root).toHaveTextContent("merqo");
  expect(root.className).toContain("lowercase");
  expect(root.className).toContain("font-extrabold");
  expect(root.className).toContain("text-lg");
  const q = root.querySelector("span");
  expect(q).toHaveTextContent("q");
  expect(q?.className).toContain("text-gold");
});

it("lets a caller override the size", () => {
  const { container } = render(<Wordmark className="text-3xl" />);
  const root = container.firstElementChild as HTMLElement;
  expect(root.className).toContain("text-3xl");
  expect(root.className).not.toContain("text-lg");
});
