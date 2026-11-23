import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runTrialSweep } from "@/lib/entitlements/trial-start";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Daily Vercel cron: start trials for qkit vendors whose first order has
 *  happened since the last run. */
export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }
  try {
    return NextResponse.json(await runTrialSweep(), { headers: NO_STORE });
  } catch (err) {
    console.error("trials cron failed", err);
    return NextResponse.json(
      { error: "Sweep failed" },
      { status: 500, headers: NO_STORE },
    );
  }
}
