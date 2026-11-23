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
