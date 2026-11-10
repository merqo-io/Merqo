/* eslint-disable no-restricted-syntax -- ImageResponse needs literal CSS colours */
import type { ReactElement } from "react";
import { brandIcon } from "@merqo/ui";

// Merqo's own mark, approximated from the OKLCH theme tokens as concrete hex.
// "Harbour Control": harbour-navy tile, buoy-amber monogram. Georgia stands in
// for the Fraunces display face, which the icon route does not load.
const BRAND_PINE = "#20416f";
const BRAND_GOLD = "#e6a13c";
const CORNER_RADIUS_RATIO = 0.22;

/** Merqo's "q" app mark for ImageResponse-generated icons. */
export function brandMark(size: number): ReactElement {
  return brandIcon(size, {
    monogram: "q",
    background: BRAND_PINE,
    foreground: BRAND_GOLD,
    fontFamily: "Georgia, 'Times New Roman', serif",
    radius: size * CORNER_RADIUS_RATIO,
  });
}
