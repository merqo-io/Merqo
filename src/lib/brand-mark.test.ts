import { describe, expect, it } from "vitest";
import { brandMark } from "@/lib/brand-mark";

type MarkProps = {
  children: string;
  style: {
    width: number;
    height: number;
    background: string;
    color: string;
    fontFamily: string;
    borderRadius: number;
  };
};

const props = (size: number) => brandMark(size).props as MarkProps;

describe("brandMark", () => {
  it("renders the 'q' letter in Georgia on a tile", () => {
    const p = props(32);
    expect(p.children).toBe("q");
    expect(p.style.fontFamily).toBe("Georgia, 'Times New Roman', serif");
    expect(p.style.background).not.toBe(p.style.color);
  });

  it("sizes the tile and scales the corner radius with the requested size", () => {
    const small = props(32);
    const large = props(180);
    expect(small.style.width).toBe(32);
    expect(small.style.height).toBe(32);
    expect(small.style.borderRadius).toBeCloseTo(32 * 0.22);
    expect(large.style.borderRadius).toBeCloseTo(180 * 0.22);
  });
});
