import {
  clientIp as sharedClientIp,
  rateLimit as sharedRateLimit,
  rateLimitStrict,
  type RateLimitStore,
} from "@merqo/ui/kit-api";
import { createServiceClient } from "@/lib/supabase/server";

/** What clientIp returns when no header yields a valid IP address. */
export const UNKNOWN_IP = "unknown";
const UNKNOWN_IP_LIMIT_FACTOR = 10;

// Vercel's own header wins, then x-real-ip; of x-forwarded-for only the LAST
// hop is used, because a client can prepend fake hops but cannot remove the
// one the platform proxy appends.
const TRUSTED_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-real-ip",
  "x-forwarded-for",
];

/** The caller's IP without trusting spoofable input, or UNKNOWN_IP. */
export function clientIp(headers: Headers): string {
  return (
    sharedClientIp(headers, { trustedHeaders: TRUSTED_IP_HEADERS }) ??
    UNKNOWN_IP
  );
}

// Store errors throw so the shared helpers apply the caller's fail policy.
const rpcStore: RateLimitStore = {
  async hit(key, limit, windowSeconds) {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || typeof data !== "boolean") {
      throw new Error(error?.message ?? "rate_limit_hit returned no boolean");
    }
    return data;
  },
};

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
  /**
   * Set by IP-keyed callers when clientIp returned UNKNOWN_IP. Explicit so a
   * user-id key can never be mistaken for the shared unknown-IP bucket.
   */
  unknownIp?: boolean;
};

/** Counts one hit and returns whether the caller is still within the limit. */
export function rateLimit(opts: RateLimitOptions): Promise<boolean> {
  // An unresolvable IP shares one bucket at 10x the limit: still bounded, so
  // stripping headers is no bypass, yet loose enough that unrelated callers
  // rarely collide.
  const limit = opts.unknownIp
    ? opts.limit * UNKNOWN_IP_LIMIT_FACTOR
    : opts.limit;
  const check = opts.failOpen ? sharedRateLimit : rateLimitStrict;
  return check(
    rpcStore,
    `${opts.bucket}:${opts.key}`,
    limit,
    opts.windowSeconds,
  );
}
