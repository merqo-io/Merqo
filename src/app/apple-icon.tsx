import { ImageResponse } from "next/og";
import { brandMark } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon.
export default function AppleIcon() {
  return new ImageResponse(brandMark(180), { ...size });
}
