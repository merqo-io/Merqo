// All amounts are integer SGD cents. Rounding rule everywhere: a fractional
// cent rounds half up (to the nearest cent, .5 goes up), done in integer
// arithmetic so floating point never decides a price.

const TERM_MONTHS = 12;

function assertCents(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function assertMonths(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > TERM_MONTHS) {
    throw new RangeError(`${name} must be an integer from 0 to ${TERM_MONTHS}`);
  }
}

/** Annual price: ten months of the current monthly price. */
export function annualCents(monthlyCents: number): number {
  assertCents("monthlyCents", monthlyCents);
  return monthlyCents * 10;
}

function proratedCents(annual: number, months: number): number {
  return Math.floor((annual * months + TERM_MONTHS / 2) / TERM_MONTHS);
}

/** Cost of adding a kit mid-term so it renews with the merchant's existing
 *  renewal date: the annual price times months left until that date over 12. */
export function coTermProrationCents(
  kitAnnualCents: number,
  monthsRemaining: number,
): number {
  assertCents("kitAnnualCents", kitAnnualCents);
  assertMonths("monthsRemaining", monthsRemaining);
  return proratedCents(kitAnnualCents, monthsRemaining);
}

/** Credit for the unused part of an annual plan when upgrading to All-Access;
 *  it is spent on All-Access months before any new charge. */
export function aaUpgradeCreditCents(
  paidAnnualCents: number,
  unusedMonths: number,
): number {
  assertCents("paidAnnualCents", paidAnnualCents);
  assertMonths("unusedMonths", unusedMonths);
  return proratedCents(paidAnnualCents, unusedMonths);
}

export interface EventPassTerms {
  perCupCents: number;
  minCents: number;
  capCents: number;
}

/** Total Event Pass price for the cups sold: per-cup rate clamped to min..cap. */
export function eventPassChargeCents(
  cups: number,
  terms: EventPassTerms,
): number {
  assertCents("cups", cups);
  return Math.min(
    terms.capCents,
    Math.max(terms.minCents, cups * terms.perCupCents),
  );
}

/** Amount billed after the event: the total minus the prepaid minimum. */
export function eventPassSettleCents(
  cups: number,
  terms: EventPassTerms,
): number {
  return eventPassChargeCents(cups, terms) - terms.minCents;
}

/**
 * Amount still owed after the event: the total minus whatever this pass
 * actually prepaid (which can differ from the plan minimum), never negative.
 */
export function eventPassTopUpCents(
  cups: number,
  terms: EventPassTerms,
  prepaidCents: number,
): number {
  return Math.max(0, eventPassChargeCents(cups, terms) - prepaidCents);
}
