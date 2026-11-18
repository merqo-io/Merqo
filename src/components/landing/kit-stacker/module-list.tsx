import { Check, Plus } from "lucide-react";
import Link from "next/link";
import {
  KITS,
  KIT_STATUS_EXPLAINER,
  KIT_STATUS_LABEL,
  WAITLISTABLE_SLUGS,
  type KitStatus,
} from "@/lib/kits";
import { cn } from "@merqo/ui/primitives";
import { Badge } from "@/components/ui/badge";

const GROUPS: { status: KitStatus; label: string }[] = [
  { status: "piloting", label: "Piloting" },
  { status: "in-build", label: "In build" },
];

export function ModuleList({
  stacked,
  highlight = null,
  onToggle,
  onHighlight,
}: {
  highlight?: string | null;
  stacked: ReadonlySet<string>;
  onToggle: (slug: string) => void;
  onHighlight: (slug: string | null) => void;
}) {
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => {
        const kits = KITS.filter((k) => k.status === g.status);
        if (!kits.length) return null;
        return (
          <div key={g.status}>
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {g.label}
            </h3>
            <ul className="mt-2 space-y-2">
              {kits.map((k) => {
                const on = stacked.has(k.slug);
                return (
                  <li
                    key={k.slug}
                    onMouseEnter={() => onHighlight(k.slug)}
                    onMouseLeave={() => onHighlight(null)}
                    onPointerDown={(e) => {
                      if (e.pointerType !== "mouse")
                        onHighlight(highlight === k.slug ? null : k.slug);
                    }}
                    onFocus={() => onHighlight(k.slug)}
                    onBlur={() => onHighlight(null)}
                    data-highlighted={highlight === k.slug || undefined}
                    className={cn(
                      "rounded-lg border bg-card p-3 transition-colors",
                      on && "border-primary/40",
                      highlight === k.slug && "ring-2 ring-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => onToggle(k.slug)}
                        className={cn(
                          "group -m-2 flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full border transition-colors group-active:bg-accent",
                            on
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "group-hover:bg-accent",
                          )}
                        >
                          {on ? (
                            <Check className="size-4" />
                          ) : (
                            <Plus className="size-4" />
                          )}
                        </span>
                        <span className="sr-only">
                          {on
                            ? `Remove ${k.name} from the stack`
                            : `Add ${k.name} to the stack`}
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold">
                            {k.name}
                          </span>
                          <Badge
                            variant={k.status === "piloting" ? "gold" : "muted"}
                            className="px-1.5 py-0 text-xs"
                          >
                            {KIT_STATUS_LABEL[k.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {KIT_STATUS_EXPLAINER[k.status]}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {k.tagline}
                        </p>
                        {WAITLISTABLE_SLUGS.includes(k.slug) && (
                          <Link
                            href={`/waitlist?kit=${k.slug}`}
                            className="mt-1 inline-block text-xs font-medium text-foreground hover:underline"
                          >
                            Join the waitlist
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
