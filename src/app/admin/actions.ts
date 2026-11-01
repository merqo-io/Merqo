"use server";
import { revalidatePath } from "next/cache";
import { requireMerqoTeam } from "@/lib/team";
import { recordAudit } from "@/lib/admin";
// eslint-disable-next-line no-restricted-imports -- no client role can write these tables; each action is gated by requireMerqoTeam
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";

/** Mark a hub-level support message resolved. Team-gated; writes via the
 *  service client since resolving isn't the submitter's own action. */
export async function resolveSupportMessageAction(
  id: string,
): Promise<ActionResult> {
  const { user } = await requireMerqoTeam();
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("support_messages")
    .update({ status: "resolved" })
    .eq("id", id);
  if (error) {
    console.error("resolveSupportMessageAction failed", error.message);
    return { success: false, error: "Could not resolve" };
  }
  await recordAudit(user.id, "resolve_support_message", id, null);
  revalidatePath("/admin");
  return { success: true };
}
