import { sgDay } from "@/lib/sg-date";

export const NEAR_CAP_PERCENT = 80;
export const MAX_AMOUNT_CENTS = 2_147_483_647;

export type CapStatus = "none" | "under" | "near" | "over";

export interface CapSummary {
  status: CapStatus;
  percentUsed: number | null;
  remainingCents: number | null;
}

/** Compares in integer cents so 79.99% never rounds up to "Near cap". */
export function capSummary(
  totalCents: number,
  capCents: number | null,
): CapSummary {
  if (capCents === null) {
    return { status: "none", percentUsed: null, remainingCents: null };
  }
  const percentUsed = (totalCents / capCents) * 100;
  let status: CapStatus = "under";
  if (totalCents >= capCents) status = "over";
  else if (totalCents * 100 >= capCents * NEAR_CAP_PERCENT) status = "near";
  return {
    status,
    percentUsed,
    remainingCents: Math.max(0, capCents - totalCents),
  };
}

/** Whole or two-decimal dollars as integer cents, or null when it is not money. */
export function dollarsToCents(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** The stored window start, or 1 January of the current Singapore year. */
export function windowStart(stored: string | null, nowMs: number): string {
  return stored ?? `${sgDay(nowMs).slice(0, 4)}-01-01`;
}
