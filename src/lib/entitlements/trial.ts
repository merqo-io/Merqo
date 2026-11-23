export const TRIAL_DAYS = 30;
export const TRIAL_LOOKUPS_PER_RUN = 25;

const DAY_MS = 86_400_000;
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export interface TrialInput {
  status: string;
  endsAt: string;
}

/** Same person, same key: lowercase and trim, drop a +tag, and for Gmail also
 *  the dots in the local part. */
export function normalizeEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  const at = clean.lastIndexOf("@");
  if (at < 1) return clean;
  const domain = clean.slice(at + 1);
  let local = clean.slice(0, at).split("+")[0];
  if (GMAIL_DOMAINS.has(domain)) local = local.replaceAll(".", "");
  return `${local}@${domain}`;
}

export function isTrialLive(trial: TrialInput, nowMs: number): boolean {
  return (
    (trial.status === "active" || trial.status === "overridden") &&
    Date.parse(trial.endsAt) > nowMs
  );
}

export function trialDaysLeft(trial: TrialInput, nowMs: number): number {
  if (!isTrialLive(trial, nowMs)) return 0;
  return Math.ceil((Date.parse(trial.endsAt) - nowMs) / DAY_MS);
}
