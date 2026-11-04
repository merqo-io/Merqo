import { tierLabel } from "@/lib/tier-label";

/** Integer cents as Singapore dollars, e.g. 1600 -> "S$16.00". */
export function formatSgd(cents: number): string {
  return `S$${(cents / 100).toFixed(2)}`;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  loopkit: "Loopkit",
  stockkit: "Stockkit",
  paykit: "Paykit",
  all_access: "All Access",
  event_pass: "Event Pass",
};

/** Display name for a plan slug; an unknown slug shows as itself. */
export function planLabel(slug: string): string {
  return tierLabel(slug) ?? PLAN_LABELS[slug] ?? slug;
}
