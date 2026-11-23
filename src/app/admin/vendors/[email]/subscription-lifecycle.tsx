import { Badge } from "@/components/ui/badge";
import {
  quotePlanChange,
  subscriptionPhase,
} from "@/lib/entitlements/lifecycle";
import type { SubscriptionRow } from "@/lib/entitlements/store";
import { formatSgd, planLabel } from "@/lib/pricing/format";
import { sgDay } from "@/lib/sg-date";
import {
  ChangePlanForm,
  ClearScheduledButton,
  EndPauseButton,
  PauseSubscriptionForm,
  type PlanChangeOption,
} from "./lifecycle-controls";
import type { SellablePlan } from "./subscription-controls";

export function lifecycleBadge(
  sub: SubscriptionRow,
  nowMs: number,
): { label: string; variant: "destructive" | "muted" } | null {
  const phase = subscriptionPhase(sub, nowMs);
  if (phase.kind === "grace") {
    const days = phase.daysLeft;
    return {
      label: `Grace: ${days} ${days === 1 ? "day" : "days"} left`,
      variant: "destructive",
    };
  }
  if (phase.kind === "paused") {
    return { label: `Paused until ${phase.endsOn}`, variant: "muted" };
  }
  if (phase.kind === "expired" && sub.status === "active") {
    return { label: "Lapsed", variant: "destructive" };
  }
  return null;
}

function changeOptions(
  sub: SubscriptionRow,
  plans: SellablePlan[],
  nowMs: number,
): PlanChangeOption[] {
  return plans
    .filter((p) => p.slug !== sub.planSlug)
    .map((p) => {
      const quote = quotePlanChange({
        interval: sub.interval,
        lockedPriceCents: sub.lockedPriceCents,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        newMonthlyCents: p.monthlyCents,
        nowMs,
        pauses: sub.pauses,
      });
      const hint =
        quote.kind === "upgrade"
          ? `Upgrades now. Collect ${formatSgd(quote.owedCents)} by PayNow for the rest of this period. The billing date stays ${sgDay(sub.currentPeriodEnd)}.`
          : `Takes effect when you renew on ${sgDay(sub.currentPeriodEnd)}.`;
      return { slug: p.slug, label: planLabel(p.slug), hint };
    });
}

/** Pause, plan change and scheduled-change controls for one active
 *  subscription. Only manually collected rows have them: nothing else here
 *  could collect the difference. */
export function SubscriptionLifecycle({
  email,
  sub,
  plans,
  today,
  nowMs,
}: {
  email: string;
  sub: SubscriptionRow;
  plans: SellablePlan[];
  today: string;
  nowMs: number;
}) {
  if (sub.status !== "active" || sub.source !== "admin_manual") return null;
  const pauses = (sub.pauses ?? []).filter((p) => p.endsOn > today);
  return (
    <div className="basis-full space-y-3 border-t pt-3">
      {sub.scheduledPlanSlug && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="muted" className="border-0 px-1.5 py-0">
            Changes to {planLabel(sub.scheduledPlanSlug)} on{" "}
            {sgDay(sub.currentPeriodEnd)}
          </Badge>
          <ClearScheduledButton email={email} subscriptionId={sub.id} />
        </p>
      )}
      {pauses.map((p) => (
        <p
          key={p.id}
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          Pause {p.startsOn} to {p.endsOn}
          {p.reason && ` (${p.reason})`}
          <EndPauseButton email={email} pauseId={p.id} />
        </p>
      ))}
      <PauseSubscriptionForm
        email={email}
        subscriptionId={sub.id}
        today={today}
      />
      {sub.founder ? (
        <p className="text-xs text-muted-foreground">
          Founder subscription: change its plan from the grant form below.
        </p>
      ) : (
        <ChangePlanForm
          email={email}
          subscriptionId={sub.id}
          options={changeOptions(sub, plans, nowMs)}
        />
      )}
    </div>
  );
}
