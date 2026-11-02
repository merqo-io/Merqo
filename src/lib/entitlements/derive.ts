import type { Plan } from "@/lib/pricing/catalog";
import type { EntitlementPayload } from "./contract";

export interface SubscriptionInput {
  planSlug: string;
  status: string;
  currentPeriodEnd: string;
  includedKits: string[];
  founder: boolean;
  founderUntil: string | null;
}

export interface EventPassInput {
  startsAt: string;
  endsAt: string;
  status: string;
}

export type KitEntitlement = Omit<
  EntitlementPayload,
  "email" | "kit" | "issued_at"
>;

// 0 = nothing, 1 = starter (qkit) or paid (other kits), 2 = full qkit tier.
type Level = 0 | 1 | 2;

interface Grant {
  kit: string;
  level: Level;
  untilMs: number;
}

const QKIT = "qkit";
const PRINTKIT = "printkit";

function toTier(kit: string, level: Level): KitEntitlement["tier"] {
  if (kit === QKIT) return (["free", "starter", "qkit"] as const)[level];
  return level > 0 ? "paid" : "free";
}

function planGrants(
  sub: SubscriptionInput,
  plan: Plan,
  allKits: string[],
  untilMs: number,
): Grant[] {
  if (plan.kind === "starter") return [{ kit: QKIT, level: 1, untilMs }];
  if (plan.kind === "kit") {
    return sub.includedKits.map((kit) => ({
      kit,
      level: kit === QKIT ? 2 : 1,
      untilMs,
    }));
  }
  if (plan.kind === "bundle") {
    return allKits.map((kit) => ({ kit, level: 2, untilMs }));
  }
  return [];
}

/** A subscription counts while its status is active and its paid period has
 *  not ended: admin-collected subscriptions have no renewal job to expire them.
 *  Founder benefits end with the founder window or the paid period, whichever
 *  comes first. */
function subscriptionGrants(
  sub: SubscriptionInput,
  plan: Plan,
  allKits: string[],
  nowMs: number,
): Grant[] {
  const periodEndMs = Date.parse(sub.currentPeriodEnd);
  if (sub.status !== "active" || Number.isNaN(periodEndMs)) return [];
  if (periodEndMs <= nowMs) return [];

  const grants = planGrants(sub, plan, allKits, periodEndMs);
  const founderUntilMs = sub.founderUntil ? Date.parse(sub.founderUntil) : NaN;
  const founderEndMs = Math.min(founderUntilMs, periodEndMs);
  if (sub.founder && founderEndMs > nowMs) {
    for (const kit of allKits) {
      grants.push({ kit, level: 2, untilMs: founderEndMs });
    }
  }
  return grants;
}

function pickEventPass(
  passes: EventPassInput[],
  nowMs: number,
): EventPassInput | null {
  const open = passes.filter(
    (p) => p.status === "active" && Date.parse(p.endsAt) > nowMs,
  );
  const running = open
    .filter((p) => Date.parse(p.startsAt) <= nowMs)
    .sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt));
  if (running[0]) return running[0];
  const upcoming = open.sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  return upcoming[0] ?? null;
}

/** What one vendor may use in each live kit: the highest tier across all
 *  active sources. Pure, so the same inputs always push the same payload. */
export function deriveEntitlements(input: {
  subscriptions: SubscriptionInput[];
  eventPasses: EventPassInput[];
  catalog: Plan[];
  liveKits: string[];
  now: Date;
}): Record<string, KitEntitlement> {
  const { subscriptions, eventPasses, catalog, liveKits } = input;
  const nowMs = input.now.getTime();
  const planBySlug = new Map(catalog.map((p) => [p.slug, p]));
  const allKits = [
    ...new Set([
      ...liveKits,
      ...catalog
        .filter((p) => p.kind === "bundle")
        .flatMap((p) => p.includedKits),
    ]),
  ];

  const grants: Grant[] = [];
  for (const sub of subscriptions) {
    const plan = planBySlug.get(sub.planSlug);
    if (plan) grants.push(...subscriptionGrants(sub, plan, allKits, nowMs));
  }
  // A full qkit tier includes printkit labels.
  for (const g of [...grants]) {
    if (g.kit === QKIT && g.level === 2) {
      grants.push({ kit: PRINTKIT, level: 1, untilMs: g.untilMs });
    }
  }

  const founder = subscriptions.some((s) => s.founder);
  const fullQkit = grants.some((g) => g.kit === QKIT && g.level === 2);
  const eventPlan = catalog.find((p) => p.kind === "event_pass");
  const pass = pickEventPass(eventPasses, nowMs);

  const result: Record<string, KitEntitlement> = {};
  for (const kit of liveKits) {
    const own = grants.filter((g) => g.kit === kit);
    const level = Math.max(0, ...own.map((g) => g.level)) as Level;
    const untilMs = Math.max(
      ...own.filter((g) => g.level === level).map((g) => g.untilMs),
    );
    result[kit] = {
      tier: toTier(kit, level),
      founder,
      stats_window: fullQkit ? "90d" : "24h",
      event_pass:
        pass && eventPlan?.includedKits.includes(kit)
          ? {
              starts_at: new Date(pass.startsAt).toISOString(),
              ends_at: new Date(pass.endsAt).toISOString(),
            }
          : null,
      valid_until: level > 0 ? new Date(untilMs).toISOString() : null,
    };
  }
  return result;
}
