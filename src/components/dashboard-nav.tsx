"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardNav as SharedDashboardNav } from "@merqo/ui";
import { signOutAction } from "@/app/actions/auth";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { submitSupportMessageAction } from "@/app/actions/support";
import { Wordmark } from "@/components/brand/wordmark";
import {
  SUPPORT_CATEGORY_LABELS,
  type SupportMessageInput,
} from "@/lib/feedback-support-schemas";

const HELP_CATEGORIES = (
  Object.keys(SUPPORT_CATEGORY_LABELS) as SupportMessageInput["category"][]
).map((value) => ({ value, label: SUPPORT_CATEGORY_LABELS[value] }));

// @merqo/ui's getHelp.onSubmit types `category` as a bare `string | undefined`
// (it has no knowledge of Merqo's own category literals), so narrow it back
// to SupportMessageInput["category"] by checking membership in the values
// HELP_CATEGORIES itself offered, instead of asserting the type.
const HELP_CATEGORY_VALUES: readonly string[] = HELP_CATEGORIES.map(
  (c) => c.value,
);
function isSupportCategory(
  value: string | undefined,
): value is SupportMessageInput["category"] {
  return value !== undefined && HELP_CATEGORY_VALUES.includes(value);
}

function onError(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Something went wrong");
}

/** The home link matches exactly; every other link matches by prefix. */
function isActive(path: string, href: string, homeHref: string): boolean {
  return href === homeHref ? path === homeHref : path.startsWith(href);
}

type NavLink = { href: string; label: string };

/**
 * Sticky header for /dashboard and /admin, composed from @merqo/ui's
 * `DashboardNav` (burger, inline links, account dropdown) the same way every
 * kit's own dashboard nav is. This file owns only merqo's bits: the
 * wordmark, the active-link rule, and the account menu's actions.
 *
 * Merqo has no per-user display name distinct from email at the account-menu
 * level (unlike a kit's vendor "stall name"), so `email` fills both
 * `vendor.name` (used only for the initials fallback) and `vendor.subtitle`
 * (the one line rendered next to the trigger and in the dropdown header).
 * Merqo has no `/dashboard/plan` route, so `showPlanItem` is off. The shared
 * menu's Profile link is hardcoded to `/dashboard/profile`, which
 * `src/app/dashboard/profile/page.tsx` redirects to Merqo's real,
 * persona-shared `/profile` route.
 */
export function DashboardNav({
  homeHref,
  homeLabel,
  badge,
  navLinks,
  email,
  avatarUrl,
  switchTo,
  switchKits,
}: {
  homeHref: string;
  /** Accessible name of the wordmark link. */
  homeLabel: string;
  /** Small label beside the wordmark, e.g. "Admin" for the team console. */
  badge?: ReactNode;
  navLinks: NavLink[];
  email?: string | null;
  avatarUrl?: string | null;
  /** Dual-role accounts get a link to the other area (dashboard or admin). */
  switchTo?: NavLink;
  switchKits?: NavLink[];
}) {
  const path = usePathname();

  return (
    <SharedDashboardNav
      wordmark={
        <Link
          href={homeHref}
          aria-label={homeLabel}
          className="flex shrink-0 items-center gap-2 rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Wordmark className="text-3xl" />
          {badge ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </Link>
      }
      navLinks={navLinks}
      isActiveHref={(href) => isActive(path, href, homeHref)}
      LinkComponent={Link}
      vendor={{
        name: email ?? "",
        avatarUrl: avatarUrl ?? undefined,
        subtitle: email ?? undefined,
      }}
      signOutAction={signOutAction}
      showPlanItem={false}
      switchKits={switchKits}
      getHelp={{
        type: "form",
        onSubmit: async ({ message, category }) => {
          const res = await submitSupportMessageAction({
            category: isSupportCategory(category) ? category : "other",
            body: message,
          });
          if (!res.success) throw new Error(res.error);
        },
        categories: HELP_CATEGORIES,
      }}
      onFeedbackSubmit={async ({ message, nps }) => {
        const res = await submitFeedbackAction({
          nps: nps ?? 0,
          message: message.trim() || undefined,
        });
        if (!res.success) throw new Error(res.error);
      }}
      feedbackMetric="nps"
      showNps
      extraLink={switchTo}
      onError={onError}
    />
  );
}
