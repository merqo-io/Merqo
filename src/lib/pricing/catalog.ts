import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import type { EventPassTerms } from "./calc";

const PlanRowSchema = z.object({
  slug: z.string(),
  kind: z.enum(["free", "kit", "starter", "bundle", "event_pass"]),
  monthly_cents: z.number().int().nonnegative(),
  included_kits: z.array(z.string()),
  active: z.boolean(),
  per_cup_cents: z.number().int().nullable(),
  min_cents: z.number().int().nullable(),
  cap_cents: z.number().int().nullable(),
  duration_days: z.number().int().nullable(),
});

export interface Plan {
  slug: string;
  kind: z.infer<typeof PlanRowSchema>["kind"];
  monthlyCents: number;
  includedKits: string[];
  active: boolean;
  /** Present only on event_pass plans. */
  eventPass: (EventPassTerms & { durationDays: number }) | null;
}

export function parsePlanRows(rows: unknown): Plan[] {
  return z
    .array(PlanRowSchema)
    .parse(rows)
    .map((r) => ({
      slug: r.slug,
      kind: r.kind,
      monthlyCents: r.monthly_cents,
      includedKits: r.included_kits,
      active: r.active,
      eventPass:
        r.kind === "event_pass" &&
        r.per_cup_cents !== null &&
        r.min_cents !== null &&
        r.cap_cents !== null &&
        r.duration_days !== null
          ? {
              perCupCents: r.per_cup_cents,
              minCents: r.min_cents,
              capCents: r.cap_cents,
              durationDays: r.duration_days,
            }
          : null,
    }));
}

/** Every plan, cheapest first. Callers decide whether to show inactive ones. */
export async function loadPlanCatalog(): Promise<Plan[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("plans")
    .select(
      "slug, kind, monthly_cents, included_kits, active, per_cup_cents, min_cents, cap_cents, duration_days",
    )
    .order("monthly_cents", { ascending: true })
    .order("slug", { ascending: true });
  if (error) throw new Error(`plans read failed: ${error.message}`);
  return parsePlanRows(data ?? []);
}
