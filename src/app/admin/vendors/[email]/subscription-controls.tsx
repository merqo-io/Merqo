"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useAsyncAction } from "@/hooks/use-async-action";
import { annualCents } from "@/lib/pricing/calc";
import { formatSgd, planLabel } from "@/lib/pricing/format";
import {
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@merqo/ui/primitives";
import { ConfirmAdminAction } from "../../confirm-admin-action";
import {
  cancelEventPassAction,
  cancelSubscriptionAction,
  grantSubscriptionAction,
  mintEventPassAction,
  repushEntitlementsAction,
  settleEventPassAction,
} from "./subscription-actions";

export interface SellablePlan {
  slug: string;
  monthlyCents: number;
}

export interface RequestPrefill {
  id: string;
  planSlug: string;
}

function defaultPriceCents(
  plans: SellablePlan[],
  slug: string,
  interval: "month" | "year",
): number {
  const monthly = plans.find((p) => p.slug === slug)?.monthlyCents ?? 0;
  return interval === "year" ? annualCents(monthly) : monthly;
}

export function GrantSubscriptionForm({
  email,
  plans,
  today,
  founderSlotsLeft,
  current,
  request,
}: {
  email: string;
  plans: SellablePlan[];
  today: string;
  founderSlotsLeft: number;
  current: string[];
  request: RequestPrefill | null;
}) {
  const { pending, run } = useAsyncAction();
  const prefilled = plans.some((p) => p.slug === request?.planSlug);
  const [slug, setSlug] = useState(
    prefilled && request ? request.planSlug : (plans[0]?.slug ?? ""),
  );
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [priceInput, setPriceInput] = useState<string | null>(null);
  const [founder, setFounder] = useState(false);
  const [replaceCurrent, setReplaceCurrent] = useState(true);
  const [periodStart, setPeriodStart] = useState(today);
  const [anchorInput, setAnchorInput] = useState<string | null>(null);

  const defaultCents = defaultPriceCents(plans, slug, interval);
  const price = priceInput ?? (defaultCents / 100).toFixed(2);
  const anchor = anchorInput ?? periodStart;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    run(async () => {
      const res = await grantSubscriptionAction({
        email,
        planSlug: slug,
        interval,
        priceCents: Math.round(Number(price) * 100),
        periodStart,
        renewalAnchor: anchor,
        founder,
        replaceCurrent,
        requestId: request?.id,
      });
      if (res.success) {
        toast.success(`Saved ${planLabel(slug)} for ${email}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="sub-plan">Plan</Label>
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger id="sub-plan" aria-label="Plan">
            <SelectValue placeholder="Select a plan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                {planLabel(p.slug)} ({formatSgd(p.monthlyCents)} a month)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sub-interval">Billing interval</Label>
        <Select
          value={interval}
          onValueChange={(v) => {
            setInterval(v as "month" | "year");
            setPriceInput(null);
          }}
        >
          <SelectTrigger id="sub-interval" aria-label="Billing interval">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Annual (ten months)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sub-price">Price charged (S$)</Label>
        <Input
          id="sub-price"
          type="number"
          min="0"
          step="0.01"
          required
          value={price}
          onChange={(e) => setPriceInput(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sub-start">Period start</Label>
        <Input
          id="sub-start"
          type="date"
          required
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sub-anchor">Renewal date anchor</Label>
        <Input
          id="sub-anchor"
          type="date"
          required
          value={anchor}
          onChange={(e) => setAnchorInput(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 self-end">
        <Switch
          id="sub-founder"
          checked={founder}
          onCheckedChange={setFounder}
          disabled={founderSlotsLeft === 0 && !founder}
        />
        <Label htmlFor="sub-founder">
          Founder (All Access benefits for 12 months)
        </Label>
      </div>
      {current.length > 0 && (
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch
            id="sub-replace"
            checked={replaceCurrent}
            onCheckedChange={setReplaceCurrent}
          />
          <Label htmlFor="sub-replace">
            Replace current plan ({current.join(", ")})
          </Label>
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || !slug}>
          {pending ? "Saving…" : "Save subscription"}
        </Button>
      </div>
    </form>
  );
}

export function CancelSubscriptionButton({
  email,
  subscriptionId,
  label,
  requestId,
}: {
  email: string;
  subscriptionId: string;
  label: string;
  requestId?: string;
}) {
  return (
    <ConfirmAdminAction
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={`Cancel ${label} for ${email}`}
          className="text-muted-foreground hover:text-destructive"
        >
          Cancel
        </Button>
      }
      title={
        <>
          Cancel {label} for {email}?
        </>
      }
      description={
        <>
          Their kits drop to the next best plan right away. You can grant the
          plan again later.
        </>
      }
      action={() =>
        cancelSubscriptionAction({ email, subscriptionId, requestId })
      }
      successMessage={`Cancelled ${label} for ${email}`}
      confirmLabel="Cancel subscription"
      pendingLabel="Cancelling…"
    />
  );
}

export function MintEventPassForm({
  email,
  today,
  minCents,
  durationDays,
}: {
  email: string;
  today: string;
  minCents: number;
  durationDays: number;
}) {
  const { pending, run } = useAsyncAction();
  const [startsAt, setStartsAt] = useState(today);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    run(async () => {
      const res = await mintEventPassAction({ email, startsAt });
      if (res.success) {
        toast.success(`Minted an event pass for ${email}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="pass-start">Pass starts</Label>
        <Input
          id="pass-start"
          type="date"
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Minting…" : "Mint event pass"}
      </Button>
      <p className="basis-full text-xs text-muted-foreground">
        Runs {durationDays} days. Mint it after the vendor has prepaid{" "}
        {formatSgd(minCents)} by PayNow.
      </p>
    </form>
  );
}

export function CancelEventPassButton({
  email,
  passId,
}: {
  email: string;
  passId: string;
}) {
  return (
    <ConfirmAdminAction
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={`Cancel the event pass for ${email}`}
          className="text-muted-foreground hover:text-destructive"
        >
          Cancel
        </Button>
      }
      title={<>Cancel this event pass for {email}?</>}
      description={<>The kits stop applying the pass window right away.</>}
      action={() => cancelEventPassAction({ email, passId })}
      successMessage={`Cancelled the event pass for ${email}`}
      confirmLabel="Cancel pass"
      pendingLabel="Cancelling…"
    />
  );
}

export function SettleEventPassButton({
  email,
  passId,
  disabled,
  topUpCents,
}: {
  email: string;
  passId: string;
  disabled: boolean;
  topUpCents: number | null;
}) {
  return (
    <ConfirmAdminAction
      trigger={
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled}
          aria-label={`Mark the event pass for ${email} settled`}
        >
          Mark settled
        </Button>
      }
      title={<>Mark this event pass settled?</>}
      description={
        <>
          Record the usage now and close the pass.
          {topUpCents !== null && (
            <> Top-up due {formatSgd(topUpCents)}.</>
          )}{" "}
          Cups are re-read when you confirm, so the final figure may differ.
          Merqo does not charge; collect it yourself.
        </>
      }
      action={() => settleEventPassAction({ email, passId })}
      successMessage={`Settled the event pass for ${email}`}
      confirmLabel="Mark settled"
      pendingLabel="Settling…"
    />
  );
}

export function RepushButton({ email }: { email: string }) {
  const { pending, run } = useAsyncAction();

  function onClick() {
    if (pending) return;
    run(async () => {
      const res = await repushEntitlementsAction({ email });
      if (!res.success) {
        toast.error(res.error);
      } else if (res.failed === 0) {
        toast.success(
          `Updated ${res.pushed} ${res.pushed === 1 ? "kit" : "kits"}`,
        );
      } else {
        toast.error(
          res.failed === 1
            ? "1 kit could not be updated. Try again."
            : `${res.failed} kits could not be updated. Try again.`,
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "Pushing…" : "Re-push to kits"}
    </Button>
  );
}
