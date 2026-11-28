"use client";

import { useState } from "react";
import { cn } from "@merqo/ui/primitives";
import { Badge } from "@/components/ui/badge";
import {
  KITS,
  KIT_STATUS_EXPLAINER,
  KIT_STATUS_LABEL,
  type Kit,
} from "@/lib/kits";

const DEFAULT_SLUG = "qkit";

function KitCard({ kit }: { kit: Kit }) {
  return (
    <div aria-live="polite" className="p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="font-display text-2xl font-bold">{kit.outcome}</p>
        <span className="font-mono text-xs text-muted-foreground">
          {kit.name}
        </span>
        <Badge variant={kit.status === "piloting" ? "gold" : "muted"}>
          {KIT_STATUS_LABEL[kit.status]}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {KIT_STATUS_EXPLAINER[kit.status]}
      </p>
      <p className="mt-4 text-base">{kit.tagline}</p>
    </div>
  );
}

/**
 * The hero's product object: one card that switches between the kits.
 * The server-rendered state is qkit, the only kit that is piloting.
 */
export function KitSwitcher() {
  const [slug, setSlug] = useState(DEFAULT_SLUG);
  const kit = KITS.find((k) => k.slug === slug) ?? KITS[0];

  return (
    <div className="w-full max-w-sm rounded-lg border bg-card">
      <div
        role="group"
        aria-label="Merqo kits"
        className="flex flex-wrap gap-2 border-b p-3"
      >
        {KITS.map((k) => {
          const selected = k.slug === kit.slug;
          return (
            <button
              key={k.slug}
              type="button"
              aria-pressed={selected}
              onClick={() => setSlug(k.slug)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-primary bg-primary text-primary-foreground active:bg-primary/80"
                  : "active:bg-muted/70",
              )}
            >
              {k.outcome}
            </button>
          );
        })}
      </div>
      <KitCard kit={kit} />
    </div>
  );
}
