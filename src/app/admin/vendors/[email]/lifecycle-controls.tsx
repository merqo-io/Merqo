"use client";
import { formatMoney } from "@merqo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useAsyncAction } from "@/hooks/use-async-action";
import { sgDay } from "@/lib/sg-date";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@merqo/ui/primitives";
import { ConfirmAdminAction } from "../../confirm-admin-action";
import {
  changePlanAction,
  clearScheduledPlanAction,
  endPauseAction,
  pauseSubscriptionAction,
} from "./lifecycle-actions";

export interface PlanChangeOption {
  slug: string;
  label: string;
  hint: string;
}

export function PauseSubscriptionForm({
  email,
  subscriptionId,
  today,
}: {
  email: string;
  subscriptionId: string;
  today: string;
}) {
  const { pending, run } = useAsyncAction();
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState("");
  const [reason, setReason] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    run(async () => {
      const res = await pauseSubscriptionAction({
        email,
        subscriptionId,
        startsOn,
        endsOn,
        reason,
      });
      if (res.success) {
        toast.success(`Paused until ${endsOn}`);
        setEndsOn("");
        setReason("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Pause subscription"
      className="grid gap-3 sm:grid-cols-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor={`pause-start-${subscriptionId}`}>Pause from</Label>
        <Input
          id={`pause-start-${subscriptionId}`}
          type="date"
          required
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`pause-end-${subscriptionId}`}>Back on</Label>
        <Input
          id={`pause-end-${subscriptionId}`}
          type="date"
          required
          value={endsOn}
          onChange={(e) => setEndsOn(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`pause-reason-${subscriptionId}`}>Reason</Label>
        <Input
          id={`pause-reason-${subscriptionId}`}
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className="self-end">
        <Button type="submit" size="sm" disabled={pending || !endsOn}>
          {pending ? "Pausing…" : "Pause"}
        </Button>
      </div>
    </form>
  );
}

export function EndPauseButton({
  email,
  pauseId,
}: {
  email: string;
  pauseId: string;
}) {
  return (
    <ConfirmAdminAction
      trigger={
        <Button type="button" variant="ghost" size="xs">
          End pause
        </Button>
      }
      title={<>End this pause for {email}?</>}
      description={
        <>
          The plan resumes today and the paid period gives back the days not
          paused.
        </>
      }
      action={() => endPauseAction({ email, pauseId })}
      successMessage={`Ended the pause for ${email}`}
      confirmLabel="End pause"
      pendingLabel="Ending…"
    />
  );
}

export function ChangePlanForm({
  email,
  subscriptionId,
  options,
}: {
  email: string;
  subscriptionId: string;
  options: PlanChangeOption[];
}) {
  const { pending, run } = useAsyncAction();
  const [slug, setSlug] = useState(options[0]?.slug ?? "");
  const chosen = options.find((o) => o.slug === slug);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !chosen) return;
    run(async () => {
      const res = await changePlanAction({
        email,
        subscriptionId,
        planSlug: slug,
      });
      if (!res.success) {
        toast.error(res.error);
      } else if (res.kind === "upgrade") {
        toast.success(
          `Now on ${chosen.label}. Collect ${formatMoney(res.owedCents)} by PayNow.`,
        );
      } else {
        toast.success(
          `Changes to ${chosen.label} on ${sgDay(res.effectiveOn)}`,
        );
      }
    });
  }

  if (options.length === 0) return null;
  return (
    <form
      onSubmit={onSubmit}
      aria-label="Change plan"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor={`change-plan-${subscriptionId}`}>Change plan</Label>
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger
            id={`change-plan-${subscriptionId}`}
            aria-label="New plan"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.slug} value={o.slug}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Change plan"}
      </Button>
      {chosen && (
        <p className="basis-full text-xs text-muted-foreground">
          {chosen.hint}
        </p>
      )}
    </form>
  );
}

export function ClearScheduledButton({
  email,
  subscriptionId,
}: {
  email: string;
  subscriptionId: string;
}) {
  return (
    <ConfirmAdminAction
      trigger={
        <Button type="button" variant="ghost" size="xs">
          Keep current plan
        </Button>
      }
      title={<>Drop the scheduled plan change for {email}?</>}
      description={<>The subscription renews on its current plan.</>}
      action={() => clearScheduledPlanAction({ email, subscriptionId })}
      successMessage="Scheduled change removed"
      confirmLabel="Drop change"
      pendingLabel="Saving…"
    />
  );
}
