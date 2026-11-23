export const FOUNDER_OFFER_DAYS = 60;

const DAY_MS = 86_400_000;

/** The badge text for a founder number, zero-padded: 1 becomes "#01". */
export function formatFounderNumber(n: number): string {
  return `#${String(n).padStart(2, "0")}`;
}

/** When the founder offer ends by date; null until billing has an open date. */
export function founderCloseDate(billingOpensAt: string | null): Date | null {
  if (!billingOpensAt) return null;
  const opens = Date.parse(billingOpensAt);
  if (Number.isNaN(opens)) return null;
  return new Date(opens + FOUNDER_OFFER_DAYS * DAY_MS);
}

export function founderClosedByDate(
  billingOpensAt: string | null,
  nowMs: number,
): boolean {
  const close = founderCloseDate(billingOpensAt);
  return close !== null && nowMs > close.getTime();
}
