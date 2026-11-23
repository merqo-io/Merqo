import { annualCents } from "@/lib/pricing/calc";

export const GRACE_DAYS = 7;
export const MAX_PAUSE_DAYS = 92;

const DAY_MS = 86_400_000;

export interface PauseWindow {
  startsOn: string;
  endsOn: string;
}

export interface LifecycleInput {
  status: string;
  source: string;
  currentPeriodEnd: string;
  pauses?: PauseWindow[];
}

export type Phase =
  | { kind: "active" }
  | { kind: "grace"; daysLeft: number; untilMs: number }
  | { kind: "paused"; endsOn: string }
  | { kind: "expired" };

function dayMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

/** The pause covering `nowMs`, if any. A pause runs from the start of
 *  `startsOn` up to, not including, `endsOn` (UTC days). */
export function runningPause(
  pauses: PauseWindow[] | undefined,
  nowMs: number,
): PauseWindow | null {
  return (
    (pauses ?? []).find(
      (p) => dayMs(p.startsOn) <= nowMs && nowMs < dayMs(p.endsOn),
    ) ?? null
  );
}

/** Grace only applies to subscriptions an admin collects by hand: nothing
 *  else renews them, so the week after the paid period gives time to pay. */
export function subscriptionPhase(sub: LifecycleInput, nowMs: number): Phase {
  const periodEndMs = Date.parse(sub.currentPeriodEnd);
  if (sub.status !== "active" || Number.isNaN(periodEndMs)) {
    return { kind: "expired" };
  }
  const pause = runningPause(sub.pauses, nowMs);
  if (pause) return { kind: "paused", endsOn: pause.endsOn };
  if (periodEndMs > nowMs) return { kind: "active" };
  const graceEndMs = periodEndMs + GRACE_DAYS * DAY_MS;
  if (sub.source === "admin_manual" && nowMs <= graceEndMs) {
    return {
      kind: "grace",
      daysLeft: Math.ceil((graceEndMs - nowMs) / DAY_MS),
      untilMs: graceEndMs,
    };
  }
  return { kind: "expired" };
}

/** Whole days between two instants, never below zero. */
function wholeDays(fromMs: number, toMs: number): number {
  return Math.max(0, Math.ceil((toMs - fromMs) / DAY_MS));
}

/** Paused days inside [fromMs, toMs]. */
function pausedDays(
  pauses: PauseWindow[] | undefined,
  fromMs: number,
  toMs: number,
): number {
  let days = 0;
  for (const p of pauses ?? []) {
    const overlap =
      Math.min(toMs, dayMs(p.endsOn)) - Math.max(fromMs, dayMs(p.startsOn));
    if (overlap > 0) days += Math.ceil(overlap / DAY_MS);
  }
  return days;
}

/** What an upgrade costs for the rest of the current period: the price
 *  difference scaled by the days left over the days in the period, to cents.
 *  The last day still counts as a day left. Paused days are neither billed
 *  nor left: the period was stretched to cover them. */
export function prorateUpgradeCents(input: {
  oldCents: number;
  newCents: number;
  periodStartMs: number;
  periodEndMs: number;
  nowMs: number;
  pauses?: PauseWindow[];
}): number {
  const total = Math.max(
    0,
    wholeDays(input.periodStartMs, input.periodEndMs) -
      pausedDays(input.pauses, input.periodStartMs, input.periodEndMs),
  );
  if (total === 0) return 0;
  const left = Math.min(
    total,
    Math.max(
      0,
      wholeDays(input.nowMs, input.periodEndMs) -
        pausedDays(input.pauses, input.nowMs, input.periodEndMs),
    ),
  );
  const diff = Math.max(0, input.newCents - input.oldCents);
  return Math.round((diff * left) / total);
}

/** The vendor-facing line for a paused or overdue subscription, or null when
 *  nothing needs saying. No prices: the vendor only learns when to pay. */
export function vendorStatusLine(
  subs: LifecycleInput[],
  nowMs: number,
): string | null {
  const phases = subs.map((s) => subscriptionPhase(s, nowMs));
  const paused = phases.find((p) => p.kind === "paused");
  if (paused) return `Plan paused until ${paused.endsOn}`;
  const grace = phases.find((p) => p.kind === "grace");
  if (!grace) return null;
  const days = grace.daysLeft;
  return `Renewal due in ${days} ${days === 1 ? "day" : "days"}`;
}

export type PlanChangeQuote =
  | { kind: "upgrade"; newPriceCents: number; owedCents: number }
  | { kind: "downgrade"; newPriceCents: number };

/** A plan that costs more than the subscription's locked price applies at
 *  once and owes the pro-rata difference; anything else waits for renewal. */
export function quotePlanChange(input: {
  interval: "month" | "year";
  lockedPriceCents: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  newMonthlyCents: number;
  nowMs: number;
  pauses?: PauseWindow[];
}): PlanChangeQuote {
  const newPriceCents =
    input.interval === "year"
      ? annualCents(input.newMonthlyCents)
      : input.newMonthlyCents;
  if (newPriceCents <= input.lockedPriceCents) {
    return { kind: "downgrade", newPriceCents };
  }
  return {
    kind: "upgrade",
    newPriceCents,
    owedCents: prorateUpgradeCents({
      oldCents: input.lockedPriceCents,
      newCents: newPriceCents,
      periodStartMs: Date.parse(input.currentPeriodStart),
      periodEndMs: Date.parse(input.currentPeriodEnd),
      nowMs: input.nowMs,
      pauses: input.pauses,
    }),
  };
}
