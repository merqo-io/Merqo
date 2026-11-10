import { createServerClient } from "@supabase/ssr";
import { annualCents } from "./calc";
import { parsePlanRows } from "./catalog";
import { planLabel } from "./format";

interface PublicPlan {
  slug: string;
  kind: string;
  name: string;
  monthly_cents: number;
  annual_cents: number;
  kits: string[];
}

interface PublicEventPass {
  per_cup_cents: number;
  min_cents: number;
  cap_cents: number;
  days: number;
}

export interface PublicPlanCatalog {
  plans: PublicPlan[];
  event_pass: PublicEventPass;
}

// Anon key and an empty cookie adapter: RLS already limits anon to active
// rows, and reading no cookies keeps the route cacheable at the CDN.
function createAnonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "merqo" },
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

/**
 * Active catalog for unauthenticated consumers (kit plan pages). Selects only
 * catalog columns and filters inactive rows again in code so a policy change
 * can never leak them through this route.
 */
export async function loadPublicPlanCatalog(): Promise<PublicPlanCatalog> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("plans")
    .select(
      "slug, kind, monthly_cents, included_kits, active, per_cup_cents, min_cents, cap_cents, duration_days",
    )
    .eq("active", true)
    .order("monthly_cents", { ascending: true })
    .order("slug", { ascending: true });
  if (error) throw new Error(`public plans read failed: ${error.message}`);

  const active = parsePlanRows(data ?? []).filter((p) => p.active);
  const terms = active.find((p) => p.kind === "event_pass")?.eventPass;
  if (!terms) throw new Error("public plans: no active event pass terms");

  const plans = active
    .filter((p) => p.kind !== "event_pass")
    .sort((a, b) => a.monthlyCents - b.monthlyCents)
    .map((p) => ({
      slug: p.slug,
      kind: p.kind,
      name: planLabel(p.slug),
      monthly_cents: p.monthlyCents,
      annual_cents: annualCents(p.monthlyCents),
      kits: p.includedKits,
    }));

  return {
    plans,
    event_pass: {
      per_cup_cents: terms.perCupCents,
      min_cents: terms.minCents,
      cap_cents: terms.capCents,
      days: terms.durationDays,
    },
  };
}
