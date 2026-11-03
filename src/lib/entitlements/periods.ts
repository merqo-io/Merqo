/** `date` plus whole calendar months in UTC; a day past the target month's end
 *  clamps to its last day (31 Jan + 1 month = 28 Feb). */
export function addMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const out = new Date(date.getTime());
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0),
  ).getUTCDate();
  out.setUTCDate(Math.min(day, lastDay));
  return out;
}

export function periodEnd(start: Date, interval: "month" | "year"): Date {
  return addMonths(start, interval === "year" ? 12 : 1);
}

/** Founder benefits run a year from the period start. */
export function founderUntil(start: Date): Date {
  return addMonths(start, 12);
}
