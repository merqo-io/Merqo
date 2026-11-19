"use client";

import Link from "next/link";
import { toast } from "sonner";
import { AccountMenu } from "@merqo/ui";
import { signOutAction } from "@/app/actions/auth";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { submitSupportMessageAction } from "@/app/actions/support";
import {
  SUPPORT_CATEGORY_LABELS,
  type SupportMessageInput,
} from "@/lib/feedback-support-schemas";

type Category = SupportMessageInput["category"];

const HELP_CATEGORIES = (
  Object.keys(SUPPORT_CATEGORY_LABELS) as Category[]
).map((value) => ({ value, label: SUPPORT_CATEGORY_LABELS[value] }));

// The shared menu types `category` as a bare string, so narrow it back by
// membership in the values this menu offered.
function isCategory(value: string | undefined): value is Category {
  return HELP_CATEGORIES.some((c) => c.value === value);
}

export async function submitHelp({
  message,
  category,
}: {
  message: string;
  category?: string;
}) {
  const res = await submitSupportMessageAction({
    category: isCategory(category) ? category : "other",
    body: message,
  });
  if (!res.success) throw new Error(res.error);
}

export async function submitFeedback({
  message,
  nps,
}: {
  message: string;
  nps?: number;
}) {
  const res = await submitFeedbackAction({
    nps: nps ?? 0,
    message: message.trim() || undefined,
  });
  if (!res.success) throw new Error(res.error);
}

export function reportError(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Something went wrong");
}

/**
 * Account dropdown for the public nav. The handlers are closures, which can't
 * cross the server/client boundary, so this client wrapper owns them while the
 * nav itself stays a Server Component.
 */
export function LandingAccountMenu({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  return (
    <AccountMenu
      vendor={{ name, avatarUrl, subtitle: name }}
      signOutAction={signOutAction}
      LinkComponent={Link}
      showPlanItem={false}
      getHelp={{
        type: "form",
        categories: HELP_CATEGORIES,
        onSubmit: submitHelp,
      }}
      onFeedbackSubmit={submitFeedback}
      feedbackMetric="nps"
      showNps
      onError={reportError}
    />
  );
}
