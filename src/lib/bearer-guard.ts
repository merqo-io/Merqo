import { NextResponse } from "next/server";
import { customerNotifySecretOk } from "@/lib/customer-notify-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Per-IP cap for kit-to-Merqo bearer routes. Kits call from shared platform
 * egress IPs, so the cap is far above real order/reward traffic; it exists to
 * bound secret-guessing and a runaway caller, not to meter normal use.
 */
const BEARER_LIMIT = 300;
const BEARER_WINDOW_SECONDS = 60;

/**
 * Shared front door for the bearer-secret routes under /api/merqo. Runs the
 * rate limit before the secret check so guessing attempts are counted too,
 * fails open if the counter is down (the secret is the real gate), and logs
 * rejected bearers without ever echoing the supplied credential.
 * Returns a response to send, or null to continue.
 */
export async function guardBearerRoute(
  request: Request,
  route: string,
  opts: { rateLimited?: boolean } = {},
): Promise<Response | null> {
  const ip = clientIp(request.headers);
  const allowed =
    opts.rateLimited === false ||
    (await rateLimit({
      bucket: `bearer:${route}`,
      key: ip,
      limit: BEARER_LIMIT,
      windowSeconds: BEARER_WINDOW_SECONDS,
      failOpen: true,
    }));
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!customerNotifySecretOk(request)) {
    console.warn(`${route}: rejected bearer (401) from ${ip}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
