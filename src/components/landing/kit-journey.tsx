"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  Journey,
  JourneyStep,
  PressButton,
  usePrefersReducedMotion,
  useScrollPlay,
} from "@merqo/ui";
import { Badge } from "@/components/ui/badge";
import {
  KITS,
  KIT_STATUS_LABEL,
  WAITLISTABLE_SLUGS,
  type Kit,
} from "@/lib/kits";

const FIRST_KIT = KITS[0];
const ADDABLE = KITS.filter((k) => k.status === "in-build");
const ADDABLE_SLUGS = ADDABLE.map((k) => k.slug);

const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-[1.5px] border-border px-4 text-sm font-semibold transition-colors hover:bg-muted active:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Press-driven state shared by the Tap step. Scrolling never presses it: it
 * only rewinds the stack once the scroll position moves back above the press.
 * Under reduced motion the stack rests complete and Reset hands the buttons back.
 */
function useTapStack() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const scrollStep = useScrollPlay(ref, 1);
  const [override, setOverride] = useState<{
    at: number;
    slugs: string[];
  } | null>(null);
  if (override !== null && !reduced) {
    if (scrollStep < override.at) setOverride(null);
    // Raising `at` keeps a press alive while scrolling on; only scrolling back
    // above the press point rewinds it.
    else if (scrollStep > override.at)
      setOverride({ ...override, at: scrollStep });
  }
  const resting = reduced ? ADDABLE_SLUGS : [];
  const added = override ? override.slugs : resting;
  return {
    ref,
    added,
    add: (slug: string) =>
      setOverride({ at: scrollStep, slugs: [...added, slug] }),
    reset: () => setOverride({ at: scrollStep, slugs: [] }),
  };
}

function KitBlock({ kit, waitlist }: { kit: Kit; waitlist?: boolean }) {
  return (
    <li className="rounded-lg border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-display font-bold">{kit.outcome}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {kit.name}
        </span>
        <Badge variant={kit.status === "piloting" ? "gold" : "muted"}>
          {KIT_STATUS_LABEL[kit.status]}
        </Badge>
      </div>
      {waitlist && WAITLISTABLE_SLUGS.includes(kit.slug) ? (
        <Link
          href={`/waitlist?kit=${kit.slug}`}
          className="inline-flex min-h-11 min-w-11 items-center text-sm font-medium underline-offset-4 hover:underline active:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Join the waitlist
        </Link>
      ) : null}
    </li>
  );
}

/** The one object every step shares: the vendor's kit list in Merqo. */
function Stack({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-lg border bg-muted/40 p-3">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function Stage({
  stageRef,
  children,
}: {
  stageRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div ref={stageRef} className="flex w-full flex-col items-center gap-3">
      {children}
    </div>
  );
}

/** Step 1 is a watch: scroll position builds qkit into the stack and rewinds on the way up. */
function StartStage() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const scrollStep = useScrollPlay(ref, 1);
  const built = reduced || scrollStep >= 1;
  return (
    <Stage stageRef={ref}>
      <Stack label="Your kits">
        {built ? (
          <KitBlock kit={FIRST_KIT} />
        ) : (
          <li
            aria-hidden
            className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground"
          >
            Your first kit goes here
          </li>
        )}
      </Stack>
    </Stage>
  );
}

function AddStage() {
  const { ref, added, add, reset } = useTapStack();
  const addedKits = ADDABLE.filter((k) => added.includes(k.slug));
  const remaining = ADDABLE.filter((k) => !added.includes(k.slug));
  return (
    <Stage stageRef={ref}>
      <Stack label="Your kits">
        <KitBlock kit={FIRST_KIT} />
        {addedKits.map((k) => (
          <KitBlock key={k.slug} kit={k} waitlist />
        ))}
      </Stack>
      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        {remaining.map((k) => (
          <PressButton
            key={k.slug}
            onClick={() => add(k.slug)}
            className="min-h-11 text-sm"
          >
            {`Add ${k.name}`}
          </PressButton>
        ))}
      </div>
      {added.length > 0 ? (
        <button type="button" onClick={reset} className={BUTTON}>
          Reset
        </button>
      ) : null}
    </Stage>
  );
}

function ManageStage() {
  return (
    <Stage>
      <Stack label="Merqo dashboard">
        {KITS.map((k) => (
          <KitBlock key={k.slug} kit={k} />
        ))}
      </Stack>
    </Stage>
  );
}

export function KitJourney() {
  return (
    <div className="border-t">
      <div className="mx-auto max-w-6xl px-6">
        <Journey
          id="kits"
          title="One kit, then the next."
          className="max-w-none px-0"
        >
          <JourneyStep
            label="Watch"
            heading="Start with one kit."
            say="qkit is piloting, for booth ordering and queues. loopkit, paykit, stockkit and printkit are in build."
            stage={<StartStage />}
          />
          <JourneyStep
            label="Tap"
            heading="Add one when you need it."
            say="Start with the kit you need. Add another only when you want it."
            stage={<AddStage />}
          />
          <JourneyStep
            label="Manage"
            heading="Run your stall."
            say="Each kit runs on its own day to day. Merqo's dashboard is where you manage them."
            stage={<ManageStage />}
          />
        </Journey>
      </div>
    </div>
  );
}
