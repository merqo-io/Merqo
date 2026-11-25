const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  qkit: "Pro",
  loopkit: "Loopkit",
  stockkit: "Stockkit",
  paykit: "Paykit",
  all_access: "All Access",
  event_pass: "Event Pass",
};

/** Display name for a plan slug; an unknown slug shows as itself. */
export function planLabel(slug: string): string {
  return PLAN_LABELS[slug] ?? slug;
}
