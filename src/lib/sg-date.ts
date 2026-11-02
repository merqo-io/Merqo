const SG_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Singapore",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of an instant in Singapore. Event passes start at Singapore
 *  midnight and subscriptions at UTC midnight (08:00 SGT, same date), so one
 *  Singapore formatter shows both as the date the admin entered. */
export function sgDay(input: string | number | Date): string {
  return SG_DAY.format(new Date(input));
}
