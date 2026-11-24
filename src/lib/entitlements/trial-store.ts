import { createServiceClient } from "@/lib/supabase/server";
import type { TrialInput } from "./trial";

// Callers gate with requireMerqoTeam() or act on the signed-in vendor's own id;
// every call goes through the service client because the table has no
// vendor-facing policies.

export interface TrialRow extends TrialInput {
  id: string;
  startedAt: string;
  firstOrderAt: string | null;
  paynowUen: string | null;
  overrideReason: string | null;
}

export interface TrialCandidate {
  vendorId: string;
  email: string;
}

type TrialDbRow = {
  id: string;
  status: string;
  started_at: string;
  ends_at: string;
  first_order_at: string | null;
  paynow_uen: string | null;
  override_reason: string | null;
};

export async function loadVendorTrial(
  vendorId: string,
): Promise<TrialRow | null> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("trials")
    .select(
      "id, status, started_at, ends_at, first_order_at, paynow_uen, override_reason",
    )
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (error) throw new Error(`trial read: ${error.message}`);
  const r = data as TrialDbRow | null;
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    startedAt: r.started_at,
    endsAt: r.ends_at,
    firstOrderAt: r.first_order_at,
    paynowUen: r.paynow_uen,
    overrideReason: r.override_reason,
  };
}

/** Idempotent: a vendor who already has a trial row keeps it. Returns the
 *  row's status ("active", "blocked", "ended" or "overridden"). */
export async function startTrial(input: {
  vendorId: string;
  emailNormalized: string;
  firstOrderAt: string;
  paynowUen: string | null;
}): Promise<string> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc("start_trial", {
    p_vendor_id: input.vendorId,
    p_email: input.emailNormalized,
    p_first_order_at: input.firstOrderAt,
    p_paynow_uen: input.paynowUen,
  });
  if (error) throw new Error(`trial start: ${error.message}`);
  return data as string;
}

/** Null when the vendor has no trial row to attach the UEN to. */
export async function setTrialUen(
  vendorId: string,
  uen: string,
): Promise<string | null> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc("set_trial_uen", {
    p_vendor_id: vendorId,
    p_uen: uen,
  });
  if (error) throw new Error(`trial uen: ${error.message}`);
  return (data as string | null) ?? null;
}

export async function overrideTrial(input: {
  vendorId: string;
  emailNormalized: string;
  adminId: string;
  reason: string;
  paynowUen: string | null;
}): Promise<string> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc("override_trial", {
    p_vendor_id: input.vendorId,
    p_email: input.emailNormalized,
    p_admin: input.adminId,
    p_reason: input.reason,
    p_paynow_uen: input.paynowUen,
  });
  if (error) throw new Error(`trial override: ${error.message}`);
  return data as string;
}

export async function loadTrialCandidates(
  limit: number,
): Promise<TrialCandidate[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc("trial_candidates", {
    p_limit: limit,
  });
  if (error) throw new Error(`trial candidates: ${error.message}`);
  return ((data ?? []) as { vendor_id: string; email: string }[]).map((r) => ({
    vendorId: r.vendor_id,
    email: r.email,
  }));
}

export async function markTrialChecked(vendorId: string): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("trial_checks")
    .upsert(
      { vendor_id: vendorId, checked_at: new Date().toISOString() },
      { onConflict: "vendor_id" },
    );
  if (error) console.error("trial check: record failed", error.message);
}
