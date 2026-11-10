"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMerqoTeam } from "@/lib/team";
import { recordAudit } from "@/lib/admin";
import type { ActionResult } from "@merqo/ui/kit-api";
import { closeRequest } from "@/lib/subscription-requests";

const declineSchema = z.object({ requestId: z.string().uuid() });

export async function declineRequestAction(
  input: z.input<typeof declineSchema>,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const parsed = declineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick a request." };
  try {
    if (!(await closeRequest(parsed.data.requestId, "declined", user.id))) {
      return { success: false, error: "That request is already closed." };
    }
  } catch {
    return {
      success: false,
      error: "Couldn't decline that request. Try again.",
    };
  }
  await recordAudit(
    user.id,
    "decline_subscription_request",
    parsed.data.requestId,
    {},
  );
  revalidatePath("/admin/requests");
  return { success: true };
}
