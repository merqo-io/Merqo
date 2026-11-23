"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMerqoTeam } from "@/lib/team";
import { recordAudit } from "@/lib/admin";
import type { ActionResult } from "@merqo/ui/kit-api";
import { loadPlanCatalog } from "@/lib/pricing/catalog";
import {
  PauseError,
  endPause,
  findVendorId,
  loadVendorSubscriptions,
  pauseSubscription,
  setScheduledPlan,
  upgradeSubscription,
  type SubscriptionRow,
} from "@/lib/entitlements/store";
import { syncVendorEntitlements } from "@/lib/entitlements/push";
import { MAX_PAUSE_DAYS, quotePlanChange } from "@/lib/entitlements/lifecycle";

const DAY_MS = 86_400_000;
const GENERIC_ERROR = "Could not save that. Try again.";
const NO_ACCOUNT = "That vendor has no Merqo account yet.";

const emailSchema = z.string().trim().toLowerCase().email();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)));
const uuidSchema = z.string().uuid();

const pauseSchema = z.object({
  email: emailSchema,
  subscriptionId: uuidSchema,
  startsOn: dateSchema,
  endsOn: dateSchema,
  reason: z.string().trim().max(200).default(""),
});
const endPauseSchema = z.object({ email: emailSchema, pauseId: uuidSchema });
const changePlanSchema = z.object({
  email: emailSchema,
  subscriptionId: uuidSchema,
  planSlug: z.string().min(1),
});
const clearSchema = z.object({
  email: emailSchema,
  subscriptionId: uuidSchema,
});

const PAUSE_MESSAGES: Record<PauseError["kind"], string> = {
  cap: "That would pass 92 paused days in a year.",
  overlap: "That overlaps another pause.",
  past: "A pause cannot start in the past.",
  inactive: "That subscription is already closed.",
  ended: "That pause has already ended.",
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function afterChange(vendor: {
  id: string;
  email: string;
}): Promise<void> {
  await syncVendorEntitlements(vendor);
  revalidatePath(`/admin/vendors/${encodeURIComponent(vendor.email)}`);
  revalidatePath("/admin/vendors");
}

export async function pauseSubscriptionAction(
  input: z.input<typeof pauseSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = pauseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Check the dates." };
  const data = parsed.data;
  const days =
    (Date.parse(`${data.endsOn}T00:00:00Z`) -
      Date.parse(`${data.startsOn}T00:00:00Z`)) /
    DAY_MS;
  if (days < 1) {
    return { success: false, error: "The pause must end after it starts." };
  }
  if (days > MAX_PAUSE_DAYS) {
    return { success: false, error: PAUSE_MESSAGES.cap };
  }
  try {
    const vendorId = await findVendorId(data.email);
    if (!vendorId) return { success: false, error: NO_ACCOUNT };
    const owns = (await loadVendorSubscriptions(vendorId)).some(
      (s) => s.id === data.subscriptionId,
    );
    if (!owns) return { success: false, error: PAUSE_MESSAGES.inactive };
    const pauseId = await pauseSubscription({
      subscriptionId: data.subscriptionId,
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      reason: data.reason,
      createdBy: user.id,
    });
    await recordAudit(user.id, "pause_subscription", pauseId, {
      email: data.email,
      subscription_id: data.subscriptionId,
      starts_on: data.startsOn,
      ends_on: data.endsOn,
      days,
    });
    await afterChange({ id: vendorId, email: data.email });
    return { success: true };
  } catch (err) {
    if (err instanceof PauseError) {
      return { success: false, error: PAUSE_MESSAGES[err.kind] };
    }
    console.error("pauseSubscriptionAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

export async function endPauseAction(
  input: z.input<typeof endPauseSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = endPauseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick a pause." };
  const data = parsed.data;
  try {
    const vendorId = await findVendorId(data.email);
    if (!vendorId) return { success: false, error: NO_ACCOUNT };
    const owns = (await loadVendorSubscriptions(vendorId)).some((s) =>
      s.pauses?.some((p) => p.id === data.pauseId),
    );
    if (!owns) return { success: false, error: PAUSE_MESSAGES.ended };
    await endPause(data.pauseId, utcToday());
    await recordAudit(user.id, "end_pause", data.pauseId, {
      email: data.email,
    });
    await afterChange({ id: vendorId, email: data.email });
    return { success: true };
  } catch (err) {
    if (err instanceof PauseError) {
      return { success: false, error: PAUSE_MESSAGES[err.kind] };
    }
    console.error("endPauseAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

function pauseStillOpen(sub: SubscriptionRow, nowMs: number): boolean {
  return (sub.pauses ?? []).some(
    (p) => Date.parse(`${p.endsOn}T00:00:00Z`) > nowMs,
  );
}

export async function changePlanAction(
  input: z.input<typeof changePlanSchema>,
): Promise<
  ActionResult<{
    kind: "upgrade" | "downgrade";
    owedCents: number;
    effectiveOn: string;
  }>
> {
  const { user } = await requireMerqoTeam();
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick a plan." };
  const data = parsed.data;
  try {
    const vendorId = await findVendorId(data.email);
    if (!vendorId) return { success: false, error: NO_ACCOUNT };
    const sub = (await loadVendorSubscriptions(vendorId)).find(
      (s) => s.id === data.subscriptionId,
    );
    if (!sub || sub.status !== "active") {
      return { success: false, error: "That subscription is already closed." };
    }
    if (sub.source !== "admin_manual") {
      return {
        success: false,
        error: "Only manually collected subscriptions change plan here.",
      };
    }
    if (sub.founder) {
      return {
        success: false,
        error:
          "Founder subscriptions keep their plan. Use the grant form to change it.",
      };
    }
    if (data.planSlug === sub.planSlug) {
      return { success: false, error: "Pick a different plan." };
    }
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
    const nowMs = Date.now();
    const quote = quotePlanChange({
      interval: sub.interval,
      lockedPriceCents: sub.lockedPriceCents,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      newMonthlyCents: plan.monthlyCents,
      nowMs,
    });
    if (quote.kind === "downgrade") {
      if (!(await setScheduledPlan(vendorId, sub.id, plan.slug))) {
        return {
          success: false,
          error: "That subscription is already closed.",
        };
      }
      await recordAudit(user.id, "schedule_plan_change", sub.id, {
        email: data.email,
        from: sub.planSlug,
        to: plan.slug,
      });
      revalidatePath(`/admin/vendors/${encodeURIComponent(data.email)}`);
      return {
        success: true,
        kind: "downgrade",
        owedCents: 0,
        effectiveOn: sub.currentPeriodEnd,
      };
    }
    if (pauseStillOpen(sub, nowMs)) {
      return {
        success: false,
        error: "End the pause before upgrading this subscription.",
      };
    }
    const newId = await upgradeSubscription({
      vendorId,
      from: sub,
      plan,
      priceCents: quote.newPriceCents,
    });
    await recordAudit(user.id, "upgrade_subscription", newId, {
      email: data.email,
      from: sub.planSlug,
      to: plan.slug,
      owed_cents: quote.owedCents,
      replaced: sub.id,
    });
    await afterChange({ id: vendorId, email: data.email });
    return {
      success: true,
      kind: "upgrade",
      owedCents: quote.owedCents,
      effectiveOn: new Date(nowMs).toISOString(),
    };
  } catch (err) {
    console.error("changePlanAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

export async function clearScheduledPlanAction(
  input: z.input<typeof clearSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick a subscription." };
  const data = parsed.data;
  try {
    const vendorId = await findVendorId(data.email);
    if (!vendorId) return { success: false, error: NO_ACCOUNT };
    if (!(await setScheduledPlan(vendorId, data.subscriptionId, null))) {
      return { success: false, error: "That subscription is already closed." };
    }
    await recordAudit(user.id, "clear_scheduled_plan", data.subscriptionId, {
      email: data.email,
    });
    revalidatePath(`/admin/vendors/${encodeURIComponent(data.email)}`);
    return { success: true };
  } catch (err) {
    console.error("clearScheduledPlanAction failed", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
