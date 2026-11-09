"use client";
import { useActionState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { joinKitWaitlist } from "@/app/actions/waitlist";
import { WAITLIST_IDLE } from "@/lib/waitlist-state";
import { UPDATES_OPT_IN_WORDING } from "@/lib/waitlist-consent";
import { Button } from "@merqo/ui/primitives";

const INPUT =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Email capture for an in-build kit. Works as a plain form action. */
export function WaitlistForm({
  kits,
  initialSlug,
}: {
  kits: { slug: string; name: string }[];
  /** Empty string leaves the select on its placeholder. */
  initialSlug: string;
}) {
  const [state, action, pending] = useActionState(
    joinKitWaitlist,
    WAITLIST_IDLE,
  );

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm font-medium text-primary"
      >
        <Check className="size-4 shrink-0" />
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-kit" className="text-sm font-medium">
          Kit
        </label>
        <select
          id="waitlist-kit"
          name="slug"
          required
          defaultValue={initialSlug}
          className={INPUT}
        >
          <option value="" disabled>
            Choose a kit
          </option>
          {kits.map((k) => (
            <option key={k.slug} value={k.slug}>
              {k.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@business.com"
          className={INPUT}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Clarence may email you about this kit.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="updatesOptIn"
          className="mt-0.5 size-4 shrink-0"
        />
        {UPDATES_OPT_IN_WORDING}
      </label>
      {state.status === "error" && (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          "…"
        ) : (
          <>
            Join the waitlist
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
