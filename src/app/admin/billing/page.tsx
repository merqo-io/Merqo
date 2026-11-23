import { requireMerqoTeam } from "@/lib/team";
import { sgDay } from "@/lib/sg-date";
import { getBillingOpensAt } from "@/lib/entitlements/billing-config";
import { FOUNDER_CAP, countFounders } from "@/lib/entitlements/store";
import {
  FOUNDER_OFFER_DAYS,
  founderCloseDate,
  founderClosedByDate,
} from "@/lib/entitlements/founder";
import { formatSgd } from "@/lib/pricing/format";
import { BillingOpenForm } from "./billing-form";

export const revalidate = 0;

export const metadata = { title: "Billing" };

const FOUNDER_PRICE_CENTS = 19900;

function offerState(closedByDate: boolean, spotsLeft: number): string {
  if (closedByDate) return "Closed: the close date has passed";
  if (spotsLeft === 0) return `Closed: all ${FOUNDER_CAP} spots are taken`;
  return "Open";
}

export default async function BillingPage() {
  await requireMerqoTeam();
  const [opensAt, founders] = await Promise.all([
    getBillingOpensAt(),
    countFounders(),
  ]);
  // eslint-disable-next-line react-hooks/purity -- the wall clock is read once per request on purpose
  const now = Date.now();
  const close = founderCloseDate(opensAt);
  const closedByDate = founderClosedByDate(opensAt, now);
  const spotsLeft = closedByDate ? 0 : Math.max(0, FOUNDER_CAP - founders);
  const state = offerState(closedByDate, spotsLeft);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Admin
        </p>
        <h1 className="font-display text-3xl font-semibold leading-none sm:text-4xl">
          Billing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          When billing opens, and where the founder offer stands.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold">Billing open date</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The founder offer closes {FOUNDER_OFFER_DAYS} days after this date, or
          once {FOUNDER_CAP} founders have joined, whichever comes first. Leave
          it empty until billing is ready.
        </p>
        <BillingOpenForm current={opensAt ? sgDay(opensAt) : null} />
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold">Founder offer</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">State</dt>
            <dd className="font-medium">{state}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Spots left</dt>
            <dd className="font-medium">
              {spotsLeft} of {FOUNDER_CAP}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Closes by date</dt>
            <dd className="font-medium">
              {close ? sgDay(close) : "No open date set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Founder price</dt>
            <dd className="font-medium">
              {formatSgd(FOUNDER_PRICE_CENTS)} prepaid for 12 months
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
