"use server";
import { submitSupportMessageAction } from "@/app/actions/support";
import type { SupportMessageInput } from "@/lib/feedback-support-schemas";
import type { ActionResult } from "@merqo/ui/kit-api";

/**
 * Adapts the shared account menu's `{ category, message }` support payload to
 * merqo's `{ category, body }` action. Validation stays in the wrapped action.
 */
export async function submitLandingSupport(input: {
  category: SupportMessageInput["category"];
  message: string;
}): Promise<ActionResult> {
  return submitSupportMessageAction({
    category: input.category,
    body: input.message,
  });
}
