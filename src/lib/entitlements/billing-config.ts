import { createServiceClient } from "@/lib/supabase/server";

// Callers gate with requireMerqoTeam() first; this runs through the service
// client against the one-row merqo.billing_config.

/** When billing opens, or null while it has no date. */
export async function getBillingOpensAt(): Promise<string | null> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("billing_config")
    .select("billing_opens_at")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(`billing config read: ${error.message}`);
  return (data?.billing_opens_at as string | null | undefined) ?? null;
}

export async function setBillingOpensAt(iso: string | null): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("billing_config")
    .update({ billing_opens_at: iso, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(`billing config write: ${error.message}`);
}

export interface RevenueConfig {
  capCents: number | null;
  windowStart: string | null;
}

export async function getRevenueConfig(): Promise<RevenueConfig> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("billing_config")
    .select("revenue_cap_cents, revenue_window_start")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(`revenue config read: ${error.message}`);
  const cap = data?.revenue_cap_cents as number | string | null | undefined;
  return {
    capCents: cap === null || cap === undefined ? null : Number(cap),
    windowStart:
      (data?.revenue_window_start as string | null | undefined) ?? null,
  };
}

export async function setRevenueConfig(config: RevenueConfig): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("billing_config")
    .update({
      revenue_cap_cents: config.capCents,
      revenue_window_start: config.windowStart,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(`revenue config write: ${error.message}`);
}
