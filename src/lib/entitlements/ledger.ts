import { createServiceClient } from "@/lib/supabase/server";

// Callers gate with requireMerqoTeam() first; the ledger is read and written
// through the service client because merqo.payments grants no write to users.

export const PAYMENT_METHODS = ["paynow", "bank_transfer", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentRow {
  id: string;
  vendorEmail: string | null;
  amountCents: number;
  receivedOn: string;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
}

export interface NewPayment {
  vendorId: string;
  amountCents: number;
  receivedOn: string;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  recordedBy: string;
}

interface RecentRow {
  id: string;
  vendor_email: string | null;
  amount_cents: number;
  received_on: string;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
}

export async function revenueTotalSince(from: string): Promise<number> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc("revenue_total", { p_from: from });
  if (error) throw new Error(`revenue total: ${error.message}`);
  return Number(data ?? 0);
}

export async function listRecentPayments(limit: number): Promise<PaymentRow[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc("recent_payments", {
    p_limit: limit,
  });
  if (error) throw new Error(`payments read: ${error.message}`);
  return ((data ?? []) as RecentRow[]).map((r) => ({
    id: r.id,
    vendorEmail: r.vendor_email,
    amountCents: r.amount_cents,
    receivedOn: r.received_on,
    method: r.method,
    reference: r.reference,
    note: r.note,
  }));
}

export async function listVendorPayments(
  vendorId: string,
  email: string,
): Promise<PaymentRow[]> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount_cents, received_on, method, reference, note")
    .eq("vendor_id", vendorId)
    .order("received_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`vendor payments read: ${error.message}`);
  return ((data ?? []) as Omit<RecentRow, "vendor_email">[]).map((r) => ({
    id: r.id,
    vendorEmail: email,
    amountCents: r.amount_cents,
    receivedOn: r.received_on,
    method: r.method,
    reference: r.reference,
    note: r.note,
  }));
}

export async function insertPayment(p: NewPayment): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("payments").insert({
    vendor_id: p.vendorId,
    amount_cents: p.amountCents,
    received_on: p.receivedOn,
    method: p.method,
    reference: p.reference,
    note: p.note,
    recorded_by: p.recordedBy,
  });
  if (error) throw new Error(`payment insert: ${error.message}`);
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(`payment delete: ${error.message}`);
}
