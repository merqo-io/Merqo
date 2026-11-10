import { createServiceClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/pricing/catalog";
import type { EntitlementPayload } from "./contract";
import type { EventPassInput, SubscriptionInput } from "./derive";
import { founderUntil, periodEnd } from "./periods";

// Every caller gates with requireMerqoTeam() first (or acts on the signed-in
// vendor's own id); these helpers run through the service client.

export const FOUNDER_CAP = 20;

export class FounderCapError extends Error {
  constructor() {
    super(`founder cap of ${FOUNDER_CAP} reached`);
  }
}

export interface SubscriptionRow extends SubscriptionInput {
  id: string;
  interval: "month" | "year";
  currentPeriodStart: string;
  renewalAnchor: string;
  lockedPriceCents: number;
  source: string;
}

export interface EventPassRow extends EventPassInput {
  id: string;
  prepaidCents: number;
  settledCups: number | null;
  settledCents: number | null;
  settledAt: string | null;
}

type SyncErrorKind = "unconfigured" | "network" | "http" | "parse" | "schema";

export interface SyncRow {
  kitSlug: string;
  lastStatus: "ok" | "failed" | "skipped";
  lastHttpStatus: number | null;
  lastErrorKind: SyncErrorKind | null;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  tier: string | null;
}

const SUBSCRIPTION_COLUMNS =
  "id, plan_slug, interval, status, current_period_start, current_period_end, renewal_anchor, locked_price_cents, included_kits, source, founder, founder_until";

type SubscriptionDbRow = {
  id: string;
  plan_slug: string;
  interval: "month" | "year";
  status: string;
  current_period_start: string;
  current_period_end: string;
  renewal_anchor: string;
  locked_price_cents: number;
  included_kits: string[];
  source: string;
  founder: boolean;
  founder_until: string | null;
};

function toSubscription(r: SubscriptionDbRow): SubscriptionRow {
  return {
    id: r.id,
    planSlug: r.plan_slug,
    interval: r.interval,
    status: r.status,
    currentPeriodStart: r.current_period_start,
    currentPeriodEnd: r.current_period_end,
    renewalAnchor: r.renewal_anchor,
    lockedPriceCents: r.locked_price_cents,
    includedKits: r.included_kits,
    source: r.source,
    founder: r.founder,
    founderUntil: r.founder_until,
  };
}

/** The merqo auth id behind a vendor email, or null if they never signed in. */
export async function findVendorId(email: string): Promise<string | null> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc("user_id_for_email", {
    p_email: email,
  });
  if (error) throw new Error(`vendor lookup: ${error.message}`);
  return (data as string | null) ?? null;
}

export async function loadVendorSubscriptions(
  vendorId: string,
): Promise<SubscriptionRow[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`subscriptions read: ${error.message}`);
  return ((data ?? []) as SubscriptionDbRow[]).map(toSubscription);
}

export async function loadVendorEventPasses(
  vendorId: string,
): Promise<EventPassRow[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("event_passes")
    .select(
      "id, starts_at, ends_at, prepaid_cents, status, settled_cups, settled_cents, settled_at",
    )
    .eq("vendor_id", vendorId)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(`event passes read: ${error.message}`);
  return (
    (data ?? []) as {
      id: string;
      starts_at: string;
      ends_at: string;
      prepaid_cents: number;
      status: string;
      settled_cups: number | null;
      settled_cents: number | null;
      settled_at: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    prepaidCents: r.prepaid_cents,
    status: r.status,
    settledCups: r.settled_cups,
    settledCents: r.settled_cents,
    settledAt: r.settled_at,
  }));
}

export async function loadSyncRows(vendorId: string): Promise<SyncRow[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("entitlement_sync")
    .select(
      "kit_slug, payload, last_status, last_http_status, last_error_kind, last_attempt_at, last_success_at",
    )
    .eq("vendor_id", vendorId)
    .order("kit_slug");
  if (error) throw new Error(`entitlement sync read: ${error.message}`);
  return (
    (data ?? []) as {
      kit_slug: string;
      payload: Partial<EntitlementPayload> | null;
      last_status: SyncRow["lastStatus"];
      last_http_status: number | null;
      last_error_kind: SyncErrorKind | null;
      last_attempt_at: string;
      last_success_at: string | null;
    }[]
  ).map((r) => ({
    kitSlug: r.kit_slug,
    lastStatus: r.last_status,
    lastHttpStatus: r.last_http_status,
    lastErrorKind: r.last_error_kind,
    lastAttemptAt: r.last_attempt_at,
    lastSuccessAt: r.last_success_at,
    tier: r.payload?.tier ?? null,
  }));
}

/** Distinct vendors who hold the founder flag, against the cap of 20. */
export async function countFounders(): Promise<number> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("vendor_id")
    .eq("founder", true);
  if (error) throw new Error(`founder count: ${error.message}`);
  return new Set((data ?? []).map((r: { vendor_id: string }) => r.vendor_id))
    .size;
}

export interface GrantInput {
  vendorId: string;
  plan: Plan;
  interval: "month" | "year";
  priceCents: number;
  periodStart: Date;
  renewalAnchor: Date;
  founder: boolean;
}

/** Create the vendor's subscription to a plan, or update the active one in
 *  place (a vendor has at most one active row per plan). */
export async function grantSubscription(input: GrantInput): Promise<string> {
  const supabase = await createServiceClient();
  const start = input.periodStart;
  const fields = {
    interval: input.interval,
    current_period_start: start.toISOString(),
    current_period_end: periodEnd(start, input.interval).toISOString(),
    renewal_anchor: input.renewalAnchor.toISOString(),
    locked_price_cents: input.priceCents,
    included_kits: input.plan.includedKits,
  };
  const founderFields = input.founder
    ? { founder: true, founder_until: founderUntil(start).toISOString() }
    : {};

  const { data: existing, error: readError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("vendor_id", input.vendorId)
    .eq("plan_slug", input.plan.slug)
    .eq("status", "active")
    .maybeSingle();
  if (readError) throw new Error(`subscription read: ${readError.message}`);

  const write = existing
    ? supabase
        .from("subscriptions")
        .update({
          ...fields,
          ...founderFields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single()
    : supabase
        .from("subscriptions")
        .insert({
          vendor_id: input.vendorId,
          plan_slug: input.plan.slug,
          ...fields,
          ...founderFields,
        })
        .select("id")
        .single();
  const { data, error } = await write;
  if (error) {
    if (error.code === "23514" && error.message.includes("founder cap")) {
      throw new FounderCapError();
    }
    throw new Error(`grant subscription: ${error.message}`);
  }
  return data.id as string;
}

/** Cancel one of the vendor's active subscriptions; false if it was not theirs. */
export async function cancelSubscription(
  vendorId: string,
  subscriptionId: string,
): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .eq("vendor_id", vendorId)
    .eq("status", "active")
    .select("id");
  if (error) throw new Error(`cancel subscription: ${error.message}`);
  return (data ?? []).length > 0;
}

export async function mintEventPass(input: {
  vendorId: string;
  startsAt: Date;
  endsAt: Date;
  prepaidCents: number;
  createdBy: string;
}): Promise<string> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("event_passes")
    .insert({
      vendor_id: input.vendorId,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      prepaid_cents: input.prepaidCents,
      created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(`mint event pass: ${error.message}`);
  return data.id as string;
}

/** Record the offline settle on one of the vendor's active passes; false if
 *  it was not theirs or is no longer active (cancelled, or settled by a
 *  concurrent click). */
export async function settleEventPass(input: {
  vendorId: string;
  passId: string;
  cups: number;
  cents: number;
  settledBy: string;
}): Promise<boolean> {
  const supabase = await createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("event_passes")
    .update({
      status: "settled",
      settled_cups: input.cups,
      settled_cents: input.cents,
      settled_at: now,
      settled_by: input.settledBy,
      updated_at: now,
    })
    .eq("id", input.passId)
    .eq("vendor_id", input.vendorId)
    .eq("status", "active")
    .select("id");
  if (error) throw new Error(`settle event pass: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Cancel one of the vendor's active passes; false if it was not theirs. */
export async function cancelEventPass(
  vendorId: string,
  passId: string,
): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("event_passes")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", passId)
    .eq("vendor_id", vendorId)
    .eq("status", "active")
    .select("id");
  if (error) throw new Error(`cancel event pass: ${error.message}`);
  return (data ?? []).length > 0;
}
