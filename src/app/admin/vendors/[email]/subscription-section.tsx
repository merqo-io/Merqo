import { Badge } from "@/components/ui/badge";
import { formatSgd, planLabel } from "@/lib/pricing/format";
import { sgDay } from "@/lib/sg-date";
import {
  statusLabel,
  subscriptionPeriodLine,
  syncFailureLabel,
} from "./subscription-labels";
import { FOUNDER_CAP } from "@/lib/entitlements/store";
import type {
  EventPassRow,
  SubscriptionRow,
  SyncRow,
} from "@/lib/entitlements/store";
import {
  CancelEventPassButton,
  CancelSubscriptionButton,
  GrantSubscriptionForm,
  MintEventPassForm,
  RepushButton,
  type RequestPrefill,
  type SellablePlan,
} from "./subscription-controls";

const day = sgDay;

function founderLabel(until: string | null, nowMs: number): string {
  if (!until) return "Founder";
  return Date.parse(until) > nowMs
    ? `Founder until ${day(until)}`
    : "Founder (benefits ended)";
}

const SYNC_BADGES = {
  ok: { variant: "success", label: "In sync" },
  failed: { variant: "destructive", label: "Failed" },
  skipped: { variant: "muted", label: "Not configured" },
} as const;

export function SubscriptionSection({
  email,
  subscriptions,
  eventPasses,
  syncRows,
  plans,
  eventTerms,
  founderCount,
  today,
  request,
  nowMs,
}: {
  email: string;
  subscriptions: SubscriptionRow[];
  eventPasses: EventPassRow[];
  syncRows: SyncRow[];
  plans: SellablePlan[];
  eventTerms: { minCents: number; durationDays: number } | null;
  founderCount: number;
  today: string;
  request: (RequestPrefill & { kind: string }) | null;
  nowMs: number;
}) {
  const slotsLeft = Math.max(0, FOUNDER_CAP - founderCount);
  return (
    <>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Subscriptions</h2>
        {request && (
          <p className="rounded-xl border border-dashed bg-card p-3 text-sm">
            Open request: {request.kind} to{" "}
            <span className="font-medium">{planLabel(request.planSlug)}</span>.
            Making the change below resolves it.
          </p>
        )}
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subscriptions. This vendor is on the free tier.
          </p>
        ) : (
          <ul className="space-y-2">
            {subscriptions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3.5 shadow-sm"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{planLabel(s.planSlug)}</span>
                    <Badge
                      variant={s.status === "active" ? "success" : "muted"}
                      className="border-0 px-1.5 py-0"
                    >
                      {statusLabel(s.status)}
                    </Badge>
                    {s.status === "active" &&
                      Date.parse(s.currentPeriodEnd) <= nowMs && (
                        <Badge
                          variant="destructive"
                          className="border-0 px-1.5 py-0"
                        >
                          Lapsed
                        </Badge>
                      )}
                    {s.founder && (
                      <Badge variant="gold" className="border-0 px-1.5 py-0">
                        {founderLabel(s.founderUntil, nowMs)}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSgd(s.lockedPriceCents)} per {s.interval}.{" "}
                    {subscriptionPeriodLine(s, nowMs, {
                      start: day(s.currentPeriodStart),
                      end: day(s.currentPeriodEnd),
                    })}
                  </p>
                </div>
                {s.status === "active" && (
                  <CancelSubscriptionButton
                    email={email}
                    subscriptionId={s.id}
                    label={planLabel(s.planSlug)}
                    requestId={request?.id}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-display text-base font-bold">
            Grant or change a subscription
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Founder slots left: {slotsLeft} of {FOUNDER_CAP}. Saving a plan the
            vendor already holds updates it in place.
          </p>
          <GrantSubscriptionForm
            email={email}
            plans={plans}
            today={today}
            founderSlotsLeft={slotsLeft}
            current={subscriptions
              .filter((s) => s.status === "active")
              .map((s) => planLabel(s.planSlug))}
            request={request}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Event passes</h2>
        {eventPasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No event passes.</p>
        ) : (
          <ul className="space-y-2">
            {eventPasses.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3.5 shadow-sm"
              >
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  {day(p.startsAt)} to {day(p.endsAt)}
                  <Badge
                    variant={p.status === "active" ? "success" : "muted"}
                    className="border-0 px-1.5 py-0"
                  >
                    {statusLabel(p.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatSgd(p.prepaidCents)} prepaid
                  </span>
                </p>
                {p.status === "active" && (
                  <CancelEventPassButton email={email} passId={p.id} />
                )}
              </li>
            ))}
          </ul>
        )}
        {eventTerms && (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-display text-base font-bold">
              Mint an event pass
            </h3>
            <MintEventPassForm
              email={email}
              today={today}
              minCents={eventTerms.minCents}
              durationDays={eventTerms.durationDays}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Kit entitlements</h2>
          <RepushButton email={email} />
        </div>
        {syncRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing pushed yet. Any grant, cancel or pass pushes it.
          </p>
        ) : (
          <ul className="space-y-2">
            {syncRows.map((r) => {
              const badge = SYNC_BADGES[r.lastStatus];
              const failure = syncFailureLabel(r);
              return (
                <li
                  key={r.kitSlug}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3.5 shadow-sm"
                >
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono">{r.kitSlug}</span>
                    {r.tier && (
                      <span className="text-muted-foreground">{r.tier}</span>
                    )}
                    <Badge
                      variant={badge.variant}
                      className="border-0 px-1.5 py-0"
                    >
                      {badge.label}
                    </Badge>
                    {r.lastStatus === "failed" && failure && (
                      <span className="text-xs text-muted-foreground">
                        {failure}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last try {day(r.lastAttemptAt)}, last success{" "}
                    {r.lastSuccessAt ? day(r.lastSuccessAt) : "never"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
