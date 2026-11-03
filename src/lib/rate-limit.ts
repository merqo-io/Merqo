import { createServiceClient } from "@/lib/supabase/server";

const MAX_IP_LENGTH = 64;
const UNKNOWN_IP_LIMIT_FACTOR = 10;

/**
 * Resolve the caller's IP without trusting spoofable input. Vercel's own
 * header wins, then x-real-ip; of x-forwarded-for only the LAST hop is used,
 * because a client can prepend any number of fake hops to the front but
 * cannot remove the one appended by the platform proxy. Capped to the length
 * persisted columns and Zod schemas accept.
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for")?.trim();
  const real = headers.get("x-real-ip")?.trim();
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  const lastHop = hops[hops.length - 1];
  return (vercel || real || lastHop || "unknown").slice(0, MAX_IP_LENGTH);
}

type RateLimitOptions = {
  /** Namespaces the counter so unrelated surfaces never share an allowance. */
  bucket: string;
  /** Per-caller identity: an IP or a user id. */
  key: string;
  limit: number;
  windowSeconds: number;
  /**
   * What to return when the counter store is unreachable. Open keeps the
   * surface available at the cost of an unmetered window; closed protects it
   * at the cost of an outage.
   */
  failOpen: boolean;
};

/** Counts one hit and returns whether the caller is still within the limit. */
export async function rateLimit(opts: RateLimitOptions): Promise<boolean> {
  // An unresolvable IP (no or garbage headers, i.e. not behind Vercel) shares
  // one bucket at 10x the limit: still bounded, so stripping headers is no
  // bypass, yet loose enough that unrelated callers rarely collide.
  const limit =
    opts.key === "unknown" ? opts.limit * UNKNOWN_IP_LIMIT_FACTOR : opts.limit;
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: `${opts.bucket}:${opts.key}`,
      p_limit: limit,
      p_window_seconds: opts.windowSeconds,
    });
    if (error || typeof data !== "boolean") {
      console.error(
        "rateLimit: counter unavailable",
        opts.bucket,
        error?.message,
      );
      return opts.failOpen;
    }
    return data;
  } catch (err) {
    console.error(
      "rateLimit: counter threw",
      opts.bucket,
      err instanceof Error ? err.message : "unknown",
    );
    return opts.failOpen;
  }
}
