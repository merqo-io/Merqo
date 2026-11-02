import type { SyncRow } from "@/lib/entitlements/store";

/** Subscriptions store "canceled" and event passes "cancelled"; the admin
 *  pages show one spelling for both. */
export function statusLabel(status: string): string {
  return status === "canceled" || status === "cancelled" ? "Cancelled" : status;
}

/** What went wrong with a kit's last push, from the kind merqo recorded.
 *  Rows written before the kind was stored fall back to the HTTP code. */
export function syncFailureLabel(
  row: Pick<SyncRow, "lastErrorKind" | "lastHttpStatus">,
): string | null {
  const code =
    row.lastHttpStatus === null ? "" : ` (HTTP ${row.lastHttpStatus})`;
  switch (row.lastErrorKind) {
    case "unconfigured":
      return "kit not configured";
    case "network":
      return "network error or timed out";
    case "parse":
    case "schema":
      return `response not understood${code}`;
    case "http":
      return row.lastHttpStatus === 404
        ? `route missing${code}`
        : `kit returned an error${code}`;
    default:
      return row.lastHttpStatus === null ? null : `HTTP ${row.lastHttpStatus}`;
  }
}

/** The line under a subscription. Only an active one can be renewed by
 *  granting again; a canceled or lapsed one just records its past period. */
export function subscriptionPeriodLine(
  s: { status: string; currentPeriodEnd: string },
  nowMs: number,
  days: { start: string; end: string },
): string {
  const range = `${days.start} to ${days.end}`;
  if (s.status !== "active") return `Cancelled. Period was ${range}.`;
  if (Date.parse(s.currentPeriodEnd) <= nowMs)
    return `Lapsed. Period was ${range}; renew by granting again.`;
  return `Period ${range}. Ends ${days.end}; renew by granting again.`;
}
