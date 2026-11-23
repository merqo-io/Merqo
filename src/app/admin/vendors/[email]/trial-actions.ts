"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMerqoTeam } from "@/lib/team";
import { recordAudit } from "@/lib/admin";
import type { ActionResult } from "@merqo/ui/kit-api";
import { findVendorId } from "@/lib/entitlements/store";
import { normalizeEmail } from "@/lib/entitlements/trial";
import { overrideTrial, setTrialUen } from "@/lib/entitlements/trial-store";
import { checkFirstOrderAndStart } from "@/lib/entitlements/trial-start";
import { syncVendorEntitlements } from "@/lib/entitlements/push";

const GENERIC_ERROR = "Could not save that. Try again.";
const NO_ACCOUNT = "That vendor has no Merqo account yet.";

const emailSchema = z.string().trim().toLowerCase().email();
const uenSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{8,12}$/);

const checkSchema = z.object({
  email: emailSchema,
  paynowUen: uenSchema.optional(),
});
const uenActionSchema = z.object({ email: emailSchema, paynowUen: uenSchema });
const overrideSchema = z.object({
  email: emailSchema,
  reason: z.string().trim().min(3).max(500),
  paynowUen: uenSchema.optional(),
});

function refresh(email: string): void {
  revalidatePath(`/admin/vendors/${encodeURIComponent(email)}`);
}

/** Look up the vendor's first qkit order now and start the trial from it. */
export async function checkFirstOrderAction(
  input: z.input<typeof checkSchema>,
): Promise<ActionResult<{ message: string }>> {
  const { user } = await requireMerqoTeam();
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Enter a valid email." };
  const { email, paynowUen } = parsed.data;
  try {
    const vendorId = await findVendorId(email);
    if (!vendorId) return { success: false, error: NO_ACCOUNT };
    const result = await checkFirstOrderAndStart(
      { id: vendorId, email },
      paynowUen ?? null,
    );
    await recordAudit(user.id, "check_first_order", vendorId, { email });
    refresh(email);
    if (result.kind === "unavailable") {
      return {
        success: false,
        error: "qkit did not report a first order date. Try again later.",
      };
    }
    if (result.kind === "no_order") {
      return { success: true, message: "No first order yet." };
    }
    if (result.status === "ineligible") {
      return {
        success: false,
        error: "This vendor has had a paid plan, so no trial applies.",
      };
    }
    return {
      success: true,
      message:
        result.status === "blocked"
          ? "A trial was already used for this email or PayNow/UEN."
          : "Trial recorded.",
    };
  } catch (err) {
    console.error("checkFirstOrderAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Save the vendor's PayNow/UEN and re-run the match against other trials. */
export async function setTrialUenAction(
  input: z.input<typeof uenActionSchema>,
): Promise<ActionResult<{ message: string }>> {
  const { user } = await requireMerqoTeam();
  const parsed = uenActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Enter 8 to 12 letters or digits." };
  }
  const { email, paynowUen } = parsed.data;
  try {
    const vendorId = await findVendorId(email);
    if (!vendorId) return { success: false, error: NO_ACCOUNT };
    const status = await setTrialUen(vendorId, paynowUen);
    if (status === null) {
      return {
        success: false,
        error:
          "No trial yet. Use Check first order now with the UEN filled in.",
      };
    }
    await recordAudit(user.id, "set_trial_uen", vendorId, { email });
    if (status === "blocked") {
      await syncVendorEntitlements({ id: vendorId, email });
    }
    refresh(email);
    return {
      success: true,
      message:
        status === "blocked"
          ? "That PayNow/UEN already had a trial, so this trial is blocked."
          : "PayNow/UEN saved.",
    };
  } catch (err) {
    console.error("setTrialUenAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Start a fresh 30 days now, whatever the abuse check said. */
export async function overrideTrialAction(
  input: z.input<typeof overrideSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = overrideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Give a reason of at least 3 characters." };
  }
  const { email, reason, paynowUen } = parsed.data;
  try {
    const vendorId = await findVendorId(email);
    if (!vendorId) return { success: false, error: NO_ACCOUNT };
    const status = await overrideTrial({
      vendorId,
      emailNormalized: normalizeEmail(email),
      adminId: user.id,
      reason,
      paynowUen: paynowUen ?? null,
    });
    await recordAudit(user.id, "override_trial", vendorId, {
      email,
      status,
    });
    await syncVendorEntitlements({ id: vendorId, email });
    refresh(email);
    return { success: true };
  } catch (err) {
    console.error("overrideTrialAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
