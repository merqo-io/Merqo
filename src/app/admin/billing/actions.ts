"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@merqo/ui/kit-api";
import { requireMerqoTeam } from "@/lib/team";
import { recordAudit } from "@/lib/admin";
import { setBillingOpensAt } from "@/lib/entitlements/billing-config";

const inputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00+08:00`)))
    .nullable(),
});

/** Set the billing open date (a Singapore calendar day), or clear it. */
export async function setBillingOpensAtAction(
  input: z.input<typeof inputSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick a valid date." };
  const iso = parsed.data.date
    ? new Date(`${parsed.data.date}T00:00:00+08:00`).toISOString()
    : null;
  try {
    await setBillingOpensAt(iso);
    await recordAudit(user.id, "set_billing_opens_at", null, {
      billing_opens_at: iso,
    });
    revalidatePath("/admin/billing");
    revalidatePath("/waitlist");
    return { success: true };
  } catch (err) {
    console.error("setBillingOpensAtAction failed", err);
    return { success: false, error: "Could not save that. Try again." };
  }
}
