"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@merqo/ui/kit-api";
import { requireMerqoTeam } from "@/lib/team";
import { recordAudit } from "@/lib/admin";
import { findVendorId } from "@/lib/entitlements/store";
import { setRevenueConfig } from "@/lib/entitlements/billing-config";
import {
  PAYMENT_METHODS,
  deletePayment,
  findPayment,
  insertPayment,
} from "@/lib/entitlements/ledger";
import { MAX_AMOUNT_CENTS, dollarsToCents } from "@/lib/entitlements/revenue";

const GENERIC_ERROR = "Could not save that. Try again.";

const cents = z
  .string()
  .transform((v) => dollarsToCents(v))
  .pipe(
    z
      .number()
      .int()
      .positive()
      .max(MAX_AMOUNT_CENTS, "That amount is too large."),
  );

const capSchema = z.object({
  cap: z.union([z.literal(""), cents]),
  windowStart: z.union([z.literal(""), z.iso.date()]),
});

const paymentSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  amount: cents,
  date: z.iso.date(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(200),
  note: z.string().trim().max(500),
});

function refresh(email?: string): void {
  revalidatePath("/admin/billing");
  if (email) revalidatePath(`/admin/vendors/${encodeURIComponent(email)}`);
}

/** Set or clear the revenue cap (entered in dollars) and the window start. */
export async function setRevenueCapAction(
  input: z.input<typeof capSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = capSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Enter a cap above 0 and a valid date." };
  }
  const capCents = parsed.data.cap === "" ? null : parsed.data.cap;
  const windowStart = parsed.data.windowStart || null;
  try {
    await setRevenueConfig({ capCents, windowStart });
    await recordAudit(user.id, "set_revenue_cap", null, {
      cap_set: capCents !== null,
      window_start: windowStart,
    });
    refresh();
    return { success: true };
  } catch (err) {
    console.error("setRevenueCapAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Record a payment received from a vendor, looked up by email. */
export async function recordPaymentAction(
  input: z.input<typeof paymentSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Check the email, amount (up to 2 decimals) and date.",
    };
  }
  const { email, amount, date, method, reference, note } = parsed.data;
  try {
    const vendorId = await findVendorId(email);
    if (!vendorId) {
      return { success: false, error: "That vendor has no Merqo account yet." };
    }
    await insertPayment({
      vendorId,
      amountCents: amount,
      receivedOn: date,
      method,
      reference: reference || null,
      note: note || null,
      recordedBy: user.id,
    });
    await recordAudit(user.id, "record_payment", vendorId, {
      amount_cents: amount,
      received_on: date,
      method,
    });
    refresh(email);
    return { success: true };
  } catch (err) {
    console.error("recordPaymentAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

const deleteSchema = z.object({
  id: z.uuid(),
  email: z.string().optional(),
});

/** Remove a payment from the ledger. */
export async function deletePaymentAction(
  input: z.input<typeof deleteSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: GENERIC_ERROR };
  try {
    const existing = await findPayment(parsed.data.id);
    if (!existing) return { success: false, error: "Payment not found" };
    await deletePayment(parsed.data.id);
    await recordAudit(user.id, "delete_payment", existing.vendorId, {
      payment_id: parsed.data.id,
      amount_cents: existing.amountCents,
      received_on: existing.receivedOn,
    });
    refresh(parsed.data.email);
    return { success: true };
  } catch (err) {
    console.error("deletePaymentAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
