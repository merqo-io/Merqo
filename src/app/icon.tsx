import { ImageResponse } from "next/og";
import { brandMark } from "@/lib/brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon / tab icon.
export default function Icon() {
  return new ImageResponse(brandMark(32), { ...size });
}
