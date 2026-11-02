import { Check, Plus } from "lucide-react";
import Link from "next/link";
import {
  KITS,
  KIT_STATUS_EXPLAINER,
  KIT_STATUS_LABEL,
  WAITLISTABLE_SLUGS,
  type KitStatus,
} from "@/lib/kits";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const GROUPS: { status: KitStatus; label: string }[] = [
  { status: "piloting", label: "Piloting" },
  { status: "in-build", label: "In build" },
];

export function ModuleList({
  stacked,
  onToggle,
  onHighlight,
}: {
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
                    className={cn(
                      "rounded-xl border bg-card p-3 shadow-sm transition-colors",
                      on && "border-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => onToggle(k.slug)}
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-100",
                          on
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "hover:bg-accent",
                        )}
                      >
                        {on ? (
                          <Check className="size-4" />
                        ) : (
                          <Plus className="size-4" />
                        )}
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
                            className="px-1.5 py-0 text-[10px]"
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
