# admin

## Purpose

The Merqo-team operator console — cross-kit revenue/activation overview, vendor
kit-access management, team membership, product health, the shared
support/feedback inbox, and the admin-audit trail. Every route under this
folder is gated by `requireMerqoTeam()` (via `layout.tsx`).

## Contents

- `layout.tsx` — `AdminLayout`, the server-component gate for the whole `/admin`
  subtree: calls `requireMerqoTeam()` once so child pages can re-derive the user
  cheaply, resolves `canSwitch` (whether the signed-in team member also has an
  active vendor kit, via `hasActiveVendorAccess`) and the account's
  email/avatar, and passes them to the shared header (`@/components/dashboard-nav.tsx`,
  a thin wrapper over `@merqo/ui`'s `DashboardNav`) with the four daily links
  (Overview / Vendors / Requests / Products) and an "Admin"
  badge beside the wordmark. Team / Feedback / Activity sit in a quiet "More
  admin pages" row under the header (`@/components/admin-secondary-nav.tsx`, which
  marks the current page with `aria-current` and wraps on narrow screens),
  because the shared account menu takes only one extra link. It passes `collapseBelow="lg"` so the links fold into the
  burger menu below 1024px, since four links still crowd the bar at md width. The layout ends with the landing `Footer` (no
  sign-in link) and hides both header and footer when printing.
- `page.tsx` — `AdminOverviewPage` (`revalidate = 0`). Fetches live products,
  vendor grants and open support messages in parallel, pulls each product's
  metrics via `fetchProductMetrics`, and derives ecosystem totals
  (`summarizeOverview`), per-product health (`classifyHealth`), and the
  onboarding funnel (`onboardingFunnel`). Renders `StatusBanner`, a
  "Needs attention" section (vendors flagged by `getTenantHealth`, with a
  "View health" link to `health/`, which redirects to `products/`; waitlisted vendors, open support messages,
  pending upgrade requests), summary `@merqo/ui` `StatCard`s, `OnboardingFunnelView`, and
  a `ProductTile` grid.
- `confirm-admin-action.dom.test.tsx` — also pins that the page behind an open confirm dialog is hidden from role queries until the action succeeds, which the e2e specs rely on.
- `page.test.tsx` — mocked-dependency coverage for the overview's flagged-vendor
  count: only active kits are passed to `getTenantHealth`, only `attention` rows
  count, and the row links to `/admin/health` (which redirects to products).
- `loading.tsx` — skeleton for `page.tsx` (stat-card and product-tile shapes).
- `actions.ts` — `"use server"` module; `resolveSupportMessageAction(id)` marks
  a hub-level `support_messages` row resolved (team-gated, writes via the
  service client, revalidates `/admin`) and calls `recordAudit()`
  (`@/lib/admin`) after a successful write (`resolve_support_message` — see
  `activity/page.tsx` below for where it surfaces).
- `actions.test.ts` — mocked `requireMerqoTeam`/`createServiceClient`/
  `recordAudit`/`revalidatePath` coverage for the action above: happy path
  (asserting the `recordAudit` call).
- `onboarding-funnel.tsx` — `OnboardingFunnelView({ counts })`. Renders the
  3-stage vendor onboarding funnel (Waitlisted → Granted → Using) as
  relative-magnitude bars against each stage's raw count. Deliberately shows
  no stage-to-stage conversion percentage — the three counts are distinct,
  non-narrowing populations (`using` can exceed `granted` by design, per
  `OnboardingCounts`' own contract in `src/lib/funnel.ts`), so a "% of
  previous stage" figure would misrepresent the data rather than just round
  it oddly.
- `product-tile.tsx` — `ProductTile({ name, result, now })`. One kit's card on
  the overview grid: health badge (reporting/lagging/down), revenue/active-
  vendor figures, and GMV/signups/pro-vendor/orders chips with a 7d trend
  arrow; renders an "Unavailable"/"Auth error"/"Bad response" placeholder when
  `result.ok` is false.
- `status-banner.tsx` — `StatusBanner({ reporting, lagging, down })`. Single-
  line, color-coded, icon-led summary of ecosystem-wide product health. The
  lagging state uses `text-gold-text`, not `gold-foreground` (navy, for solid
  gold only), so it stays readable on the gold tint in dark mode.
- `support-message-row.tsx` — `SupportMessageRow({ message })`. One row in the
  "Needs attention" support-message list; shows which kit a message came from
  (`kit_slug`, `null` renders as "merqo") plus category and body.
- `resolve-support-message-button.tsx` — `ResolveSupportMessageButton({ id })`
  client component; calls `resolveSupportMessageAction` in a transition and
  toasts on failure.
- `feedback/` — sub-route: per-kit NPS/CSAT breakdown plus a combined,
  kit-tagged vendor-comments list, backed by `merqo.vendor_feedback`.
- `products/` — sub-route: product/kit registry health list
  (`product-health-card.tsx`) plus the per-tenant incident table across kits
  (`tenant-health-section.tsx`, built from `getTenantHealth()`).
- `health/` — redirects to `products/`.
- `team/` — sub-route: add/remove Merqo-team members (`add-team-form.tsx`,
  `remove-member.tsx`, server `actions.ts`). Both actions call
  `recordAudit()` after a successful write (`add_team_member`,
  `remove_team_member`) — `add_team_member`'s `target_id` is the newly
  added member's own user id (returned by `addTeamMemberByEmail()`), not
  the acting admin's.
- `vendors/` — sub-route: vendor list + per-vendor (`[email]/`) kit-access
  grant/revoke management (`grant-form.tsx`, `revoke-button.tsx`, server
  `actions.ts`). Both actions call `recordAudit()` after a successful write
  (`grant_kit_access`, `revoke_kit_access`) — vendors are email-keyed with
  no stable uuid at grant time, so `target_id` is `null` and the vendor
  email + kit slug travel in `detail` instead. `[email]/page.tsx` also
  renders an "Activity" section — one card per kit the vendor is `active`
  on, pulled live via `getVendorActivity()` (`@/lib/vendor-activity-client`),
  each card carrying that kit's 72-hour incident list. Opening the page
  records a `view_vendor` audit row with only an email hash. The vendors page
  header shows "Founder slots left: N of 20". `[email]/` also holds the
  subscription card, event pass minting and per-kit push state, all audited
  (`grant_subscription`, `cancel_subscription`, `mint_event_pass`,
  `cancel_event_pass`, `repush_entitlements`, `resolve_subscription_request`).
  See `[email]/README.md`.
- `requests/` — sub-route: the queue of plan changes vendors asked for from
  their dashboard; resolve on the vendor page or decline. See
  `requests/README.md`.
- `activity/` — sub-route (`page.tsx` + `page.test.tsx`): `AdminActivityPage`
  server-fetches the most recent 100 `merqo.admin_audit` rows via
  `listAdminAuditEntries()` (`@/lib/admin`) and maps each row to an
  `AuditLogEntry` (`actor` = the resolved admin email, `target` = `target_id`,
  `detail` = the `detail` jsonb stringified) — plain, serializable data, passed
  to `activity-log.tsx`'s `ActivityLog` client component. `ActivityLog` wraps
  `@merqo/ui`'s `AuditLogTable` in a client wrapper that owns the `formatAction()` lookup from raw action
  strings (see the bullets above for the full list) to human labels.

## Connectivity

`layout.tsx` wraps every route below it (including `feedback/`, `products/`,
`team/`, `vendors/`, and `activity/`) and is the only place the
`requireMerqoTeam()` gate and header data-resolution live; every real
mutating action across those sub-routes (plus this folder's own `actions.ts`)
calls `recordAudit()`, and `activity/page.tsx` is where those rows surface.
The shared nav highlights whichever sub-route is active. `page.tsx` is the overview dashboard, built
from this folder's own components (`StatusBanner`, `OnboardingFunnelView`,
`ProductTile`, `SupportMessageRow`) plus `@merqo/ui`'s `StatCard`. `actions.ts` is called by
`resolve-support-message-button.tsx`, which client components trigger via
`useTransition` then `router.refresh()`.

See the repo root [README.md](../../../README.md) for the full `src/app/`
layout and how this console fits the rest of Merqo.

## Shared presentation and confirmations

ProductTile and ProductHealthCard use ProductHealthBadge for consistent health labels. Their business and operational diagnostics remain distinct. RemoveMember and RevokeButton delegate their dialog state to ConfirmAdminAction, a thin adapter that maps the server actions' `{ success, error }` result onto `@merqo/ui`'s `ConfirmDialog` (failures show inline in the dialog); each adapter retains its own action arguments. Pending operations block dismissal, returned errors and rejected requests keep the confirmation available for retry, and successful operations close it.

Every page and action is gated by `requireMerqoTeam()`, which also requires a verified second factor (`aal2`); a password-only session is redirected to `/mfa`.

## Loading skeleton

`loading.tsx` renders a `role="status"` region with `aria-busy` and an `sr-only` label; its pulsing blocks use `motion-reduce:animate-none`.

Admin pages share one header pattern (Admin eyebrow, display title, one-line description) and set per-route browser titles via `metadata`.

Admin action errors use plain copy ("Could not ... Try again.") with no em dashes.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.

Server Actions here return the shared `ActionResult` from `@merqo/ui/kit-api`.
