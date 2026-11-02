import { createServiceClient } from "@/lib/supabase/server";
import { adminEmailsById } from "@/lib/admin-read";
import type { Plan } from "@/lib/pricing/catalog";

export type RequestKind = "upgrade" | "downgrade" | "cancel";

export interface SubscriptionRequest {
  id: string;
  vendorId: string;
  planSlug: string;
  interval: "month" | "year";
  kind: RequestKind;
  status: "pending" | "resolved" | "declined";
  note: string | null;
  createdAt: string;
}

const COLUMNS =
  "id, vendor_id, plan_slug, interval, kind, status, note, created_at";

type Row = {
  id: string;
  vendor_id: string;
  plan_slug: string;
  interval: "month" | "year";
  kind: RequestKind;
  status: SubscriptionRequest["status"];
  note: string | null;
  created_at: string;
};

function toRequest(r: Row): SubscriptionRequest {
  return {
    id: r.id,
    vendorId: r.vendor_id,
    planSlug: r.plan_slug,
    interval: r.interval,
    kind: r.kind,
    status: r.status,
    note: r.note,
    createdAt: r.created_at,
  };
}

/** The cheapest sellable plan that includes `kitSlug`, which is what an
 *  upgrade button on that kit's card asks for. Null when nothing is on sale. */
export function upgradePlanForKit(
  catalog: Plan[],
  kitSlug: string,
): Plan | null {
  const sellable = catalog
    .filter(
      (p) =>
        p.active &&
        (p.kind === "kit" || p.kind === "starter" || p.kind === "bundle") &&
        p.includedKits.includes(kitSlug),
    )
    .sort((a, b) => a.monthlyCents - b.monthlyCents);
  return sellable[0] ?? null;
}

/** File a request for the team to resolve. A vendor has at most one pending
 *  request, so a second click returns created: false instead of stacking. */
export async function createSubscriptionRequest(input: {
  vendorId: string;
  planSlug: string;
  kind: RequestKind;
  note: string;
}): Promise<{ created: boolean }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("subscription_requests").insert({
    vendor_id: input.vendorId,
    plan_slug: input.planSlug,
    kind: input.kind,
    note: input.note,
  });
  if (!error) return { created: true };
  if (error.code === "23505") return { created: false };
  throw new Error(`create subscription request: ${error.message}`);
}

/** Vendor auth ids to emails for the admin queue; unresolved ids map to null. */
export async function vendorEmailsById(
  vendorIds: string[],
): Promise<Map<string, string | null>> {
  return adminEmailsById(await createServiceClient(), vendorIds);
}

export async function listPendingRequests(): Promise<SubscriptionRequest[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("subscription_requests")
    .select(COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`requests read: ${error.message}`);
  return ((data ?? []) as Row[]).map(toRequest);
}

export async function getPendingRequest(
  id: string,
  vendorId: string,
): Promise<SubscriptionRequest | null> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("subscription_requests")
    .select(COLUMNS)
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw new Error(`request read: ${error.message}`);
  return data ? toRequest(data as Row) : null;
}

/** Close a pending request; false if someone else already did. */
export async function closeRequest(
  id: string,
  status: "resolved" | "declined",
  adminId: string,
): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("subscription_requests")
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) throw new Error(`close request: ${error.message}`);
  return (data ?? []).length > 0;
}
