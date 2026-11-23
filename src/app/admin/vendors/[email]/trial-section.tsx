import { Badge } from "@/components/ui/badge";
import { sgDay } from "@/lib/sg-date";
import { isTrialLive, trialDaysLeft } from "@/lib/entitlements/trial";
import type { TrialRow } from "@/lib/entitlements/trial-store";
import { TrialControls } from "./trial-controls";

export function trialStatusLine(trial: TrialRow | null, nowMs: number): string {
  if (!trial)
    return "No trial yet. It starts at the vendor's first qkit order.";
  if (trial.status === "blocked") {
    return "Blocked: this email or PayNow/UEN already had a trial.";
  }
  if (isTrialLive(trial, nowMs)) {
    const left = trialDaysLeft(trial, nowMs);
    return `${left} ${left === 1 ? "day" : "days"} left, ends ${sgDay(trial.endsAt)}`;
  }
  return `Ended ${sgDay(trial.endsAt)}`;
}

const BADGES = {
  active: { variant: "success", label: "Active" },
  overridden: { variant: "success", label: "Overridden" },
  blocked: { variant: "destructive", label: "Blocked" },
  ended: { variant: "muted", label: "Ended" },
} as const;

export function TrialSection({
  email,
  trial,
  nowMs,
}: {
  email: string;
  trial: TrialRow | null;
  nowMs: number;
}) {
  const badge = trial ? BADGES[trial.status as keyof typeof BADGES] : null;
  const live = trial ? isTrialLive(trial, nowMs) : false;
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-bold">Free trial</h2>
        {badge && (
          <Badge variant={badge.variant} className="border-0 px-1.5 py-0">
            {badge.label}
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {trialStatusLine(trial, nowMs)}
      </p>
      {trial?.firstOrderAt && (
        <p className="mt-1 text-sm text-muted-foreground">
          First order {sgDay(trial.firstOrderAt)}
        </p>
      )}
      {trial?.overrideReason && (
        <p className="mt-1 text-sm text-muted-foreground">
          Override reason: {trial.overrideReason}
        </p>
      )}
      <TrialControls
        email={email}
        paynowUen={trial?.paynowUen ?? null}
        canOverride={!live}
      />
    </section>
  );
}
