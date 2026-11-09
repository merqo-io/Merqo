"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMerqoTeam } from "@/lib/team";
import { recordAudit } from "@/lib/admin";
import type { ActionResult } from "@merqo/ui/kit-api";
import { loadPlanCatalog } from "@/lib/pricing/catalog";
import {
  FounderCapError,
  cancelEventPass,
  cancelSubscription,
  findVendorId,
  grantSubscription,
  loadVendorEventPasses,
  loadVendorSubscriptions,
  mintEventPass,
  settleEventPass,
} from "@/lib/entitlements/store";
import { eventPassTopUpCents } from "@/lib/pricing/calc";
import { getEventPassUsage } from "@/lib/event-pass-usage-client";
import { syncVendorEntitlements } from "@/lib/entitlements/push";
import { closeRequest, getPendingRequest } from "@/lib/subscription-requests";

const DAY_MS = 86_400_000;
const GENERIC_ERROR = "Could not save that. Try again.";

const emailSchema = z.string().trim().toLowerCase().email();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)));
const uuidSchema = z.string().uuid();

const grantSchema = z.object({
  email: emailSchema,
  planSlug: z.string().min(1),
  interval: z.enum(["month", "year"]),
  priceCents: z.number().int().min(0),
  periodStart: dateSchema,
  renewalAnchor: dateSchema,
  founder: z.boolean(),
  replaceCurrent: z.boolean().default(true),
  requestId: uuidSchema.optional(),
});

const cancelSchema = z.object({
  email: emailSchema,
  subscriptionId: uuidSchema,
  requestId: uuidSchema.optional(),
});

const mintSchema = z.object({
  email: emailSchema,
  startsAt: dateSchema,
  prepaidCents: z.number().int().min(0).optional(),
});

const cancelPassSchema = z.object({ email: emailSchema, passId: uuidSchema });
const settlePassSchema = z.object({ email: emailSchema, passId: uuidSchema });
const repushSchema = z.object({ email: emailSchema });

function utcDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

// Event passes are for Singapore events, so a pass starts at local midnight.
function sgDay(day: string): Date {
  return new Date(`${day}T00:00:00+08:00`);
}

/** Mark the request this change answers as resolved, if it is still open. */
async function resolveRequest(
  adminId: string,
  vendorId: string,
  requestId: string | undefined,
): Promise<void> {
  if (!requestId || !(await getPendingRequest(requestId, vendorId))) return;
  if (await closeRequest(requestId, "resolved", adminId)) {
    await recordAudit(adminId, "resolve_subscription_request", requestId, {});
  }
}

/** Close the vendor's other active subscriptions so a plan change replaces
 *  the old plan instead of stacking on it. */
async function cancelSuperseded(
  adminId: string,
  vendorId: string,
  email: string,
  keepId: string,
): Promise<void> {
  const subs = await loadVendorSubscriptions(vendorId);
  for (const sub of subs) {
    if (sub.id === keepId || sub.status !== "active") continue;
    if (await cancelSubscription(vendorId, sub.id)) {
      await recordAudit(adminId, "cancel_subscription", sub.id, {
        email,
        replaced_by: keepId,
      });
    }
  }
}

async function afterChange(vendor: {
  id: string;
  email: string;
}): Promise<void> {
  await syncVendorEntitlements(vendor);
  revalidatePath(`/admin/vendors/${encodeURIComponent(vendor.email)}`);
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/requests");
}

export async function grantSubscriptionAction(
  input: z.input<typeof grantSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Check the plan, price and dates." };
  }
  const data = parsed.data;
  try {
    const plan = (await loadPlanCatalog()).find(
      (p) => p.slug === data.planSlug,
    );
    if (
      !plan ||
      !plan.active ||
      !["kit", "starter", "bundle"].includes(plan.kind)
    ) {
      return { success: false, error: "That plan is not on sale." };
    }
    const vendorId = await findVendorId(data.email);
    if (!vendorId) {
      return {
        success: false,
        error:
          "That vendor has no Merqo account yet. Ask them to sign in once.",
      };
    }
    const subscriptionId = await grantSubscription({
      vendorId,
      plan,
      interval: data.interval,
      priceCents: data.priceCents,
      periodStart: utcDay(data.periodStart),
      renewalAnchor: utcDay(data.renewalAnchor),
      founder: data.founder,
    });
    await recordAudit(user.id, "grant_subscription", subscriptionId, {
      email: data.email,
      plan: plan.slug,
      interval: data.interval,
      price_cents: data.priceCents,
      founder: data.founder,
    });
    let replaced = true;
    if (data.replaceCurrent) {
      try {
        await cancelSuperseded(user.id, vendorId, data.email, subscriptionId);
      } catch (err) {
        console.error("cancelSuperseded failed", err);
        replaced = false;
      }
    }
    await resolveRequest(user.id, vendorId, data.requestId);
    await afterChange({ id: vendorId, email: data.email });
    if (!replaced) {
      return {
        success: false,
        error:
          "Plan saved, but the old plan was not cancelled. Cancel it from the list.",
      };
    }
    return { success: true };
  } catch (err) {
    if (err instanceof FounderCapError) {
      return { success: false, error: "All 20 founder slots are taken." };
    }
    console.error("grantSubscriptionAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

export async function cancelSubscriptionAction(
  input: z.input<typeof cancelSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick a subscription." };
  const data = parsed.data;
  try {
    const vendorId = await findVendorId(data.email);
    if (
      !vendorId ||
      !(await cancelSubscription(vendorId, data.subscriptionId))
    ) {
      return { success: false, error: "That subscription is already closed." };
    }
    await recordAudit(user.id, "cancel_subscription", data.subscriptionId, {
      email: data.email,
    });
    await resolveRequest(user.id, vendorId, data.requestId);
    await afterChange({ id: vendorId, email: data.email });
    return { success: true };
  } catch (err) {
    console.error("cancelSubscriptionAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

export async function mintEventPassAction(
  input: z.input<typeof mintSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = mintSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick a start date." };
  const data = parsed.data;
  try {
    const terms = (await loadPlanCatalog()).find(
      (p) => p.kind === "event_pass" && p.active,
    )?.eventPass;
    if (!terms) {
      return { success: false, error: "Event passes are not on sale." };
    }
    const vendorId = await findVendorId(data.email);
    if (!vendorId) {
      return {
        success: false,
        error:
          "That vendor has no Merqo account yet. Ask them to sign in once.",
      };
    }
    const startsAt = sgDay(data.startsAt);
    const prepaidCents = data.prepaidCents ?? terms.minCents;
    const passId = await mintEventPass({
      vendorId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + terms.durationDays * DAY_MS),
      prepaidCents,
      createdBy: user.id,
    });
    await recordAudit(user.id, "mint_event_pass", passId, {
      email: data.email,
      starts_at: startsAt.toISOString(),
      prepaid_cents: prepaidCents,
    });
    await afterChange({ id: vendorId, email: data.email });
    return { success: true };
  } catch (err) {
    console.error("mintEventPassAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

export async function cancelEventPassAction(
  input: z.input<typeof cancelPassSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = cancelPassSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick an event pass." };
  const data = parsed.data;
  try {
    const vendorId = await findVendorId(data.email);
    if (!vendorId || !(await cancelEventPass(vendorId, data.passId))) {
      return { success: false, error: "That event pass is already closed." };
    }
    await recordAudit(user.id, "cancel_event_pass", data.passId, {
      email: data.email,
    });
    await afterChange({ id: vendorId, email: data.email });
    return { success: true };
  } catch (err) {
    console.error("cancelEventPassAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Record the offline top-up for an ended pass. Cups are re-read from the kit
 *  here, never taken from the client, so the stored figures can't be forged. */
export async function settleEventPassAction(
  input: z.input<typeof settlePassSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = settlePassSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick an event pass." };
  const data = parsed.data;
  try {
    const terms = (await loadPlanCatalog()).find(
      (p) => p.kind === "event_pass" && p.active,
    )?.eventPass;
    if (!terms) {
      return { success: false, error: "Event passes are not on sale." };
    }
    const vendorId = await findVendorId(data.email);
    if (!vendorId) {
      return { success: false, error: "That vendor has no Merqo account yet." };
    }
    const pass = (await loadVendorEventPasses(vendorId)).find(
      (p) => p.id === data.passId,
    );
    if (!pass) return { success: false, error: "Pick an event pass." };
    if (pass.status !== "active") {
      return { success: false, error: "That event pass is already closed." };
    }
    if (Date.parse(pass.endsAt) > Date.now()) {
      return { success: false, error: "That event pass hasn't ended yet." };
    }
    const usage = await getEventPassUsage({
      vendorId,
      startsAt: pass.startsAt,
      endsAt: pass.endsAt,
    });
    if (!usage.ok) {
      return { success: false, error: "Usage is unavailable. Try again." };
    }
    const cents = eventPassTopUpCents(usage.cups, terms, pass.prepaidCents);
    const settled = await settleEventPass({
      vendorId,
      passId: pass.id,
      cups: usage.cups,
      cents,
      settledBy: user.id,
    });
    if (!settled) {
      return { success: false, error: "That event pass is already closed." };
    }
    await recordAudit(user.id, "settle_event_pass", pass.id, {
      email: data.email,
      cups: usage.cups,
      settled_cents: cents,
    });
    revalidatePath(`/admin/vendors/${encodeURIComponent(data.email)}`);
    return { success: true };
  } catch (err) {
    console.error("settleEventPassAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Re-send the vendor's current entitlement to every live kit. */
export async function repushEntitlementsAction(
  input: z.input<typeof repushSchema>,
): Promise<ActionResult<{ pushed: number; failed: number }>> {
  const { user } = await requireMerqoTeam();
  const parsed = repushSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Enter a valid email." };
  try {
    const vendorId = await findVendorId(parsed.data.email);
    if (!vendorId) {
      return { success: false, error: "That vendor has no Merqo account yet." };
    }
    const outcomes = await syncVendorEntitlements({
      id: vendorId,
      email: parsed.data.email,
    });
    await recordAudit(user.id, "repush_entitlements", vendorId, {
      email: parsed.data.email,
    });
    revalidatePath(`/admin/vendors/${encodeURIComponent(parsed.data.email)}`);
    const pushed = outcomes.filter((o) => o.result.ok).length;
    return { success: true, pushed, failed: outcomes.length - pushed };
  } catch (err) {
    console.error("repushEntitlementsAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
