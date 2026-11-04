// Stored tier values stay as-is (`qkit` is the legacy slug for the top paid
// tier); only the label shown to users follows the Free / Starter / Pro
// convention. Keep this local map because merqo-ui's helper is client-only
// and planLabel runs on the server.
const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  qkit: "Pro",
};

/** User-facing label for a stored tier value, or undefined when it has none. */
export function tierLabel(value: string): string | undefined {
  return TIER_LABELS[value];
}
