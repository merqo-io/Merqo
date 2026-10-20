# components

## Purpose

Shared React components used across the dashboard, admin console, landing
page, and login page — everything that isn't a raw shadcn primitive (`ui/`)
or scoped to `dashboard/`/`landing/`.

## Contents

- `dashboard-nav.tsx` — `DashboardNav`: thin adapter composing `@merqo/ui`'s
  shared `DashboardNav` (burger, inline links, account dropdown) for both the
  `/dashboard` and `/admin` headers. Callers pass the home href, wordmark
  label, optional badge ("Admin"), link list, and an optional cross-persona
  link (`extraLink`) or kit switcher (`switchKits`); it wires Merqo's
  `signOutAction`, `submitFeedbackAction`/`submitSupportMessageAction`
  (throw-adapting, since both return `{success, error}`), the support-category
  list and `LinkComponent={Link}`. No `/dashboard/plan` route exists, so
  `showPlanItem` is off. `email` fills both `vendor.name` (initials fallback)
  and `vendor.subtitle`.
- `dashboard-nav.test.tsx` — RTL tests: wordmark/badge, active-link rule,
  kit switcher, trigger subtitle/initials, menu-item order (no Plan item),
  the switch link, Feedback/Get-help submit wiring and sign-out.
- `dashboard-tour.tsx` — `DashboardTour({ seen })`: thin adapter wiring
  Merqo's own step content (`tour-steps.ts`), `markTourSeen`, and routing
  into `@merqo/ui`'s shared `DashboardTour`, which owns the tour mechanism
  itself (`driver.js` lifecycle, auto-run/replay timing, popover styling).
- `dashboard-tour.dom.test.tsx` — RTL tests asserting the props threaded
  into the shared `DashboardTour` (steps resolver, seen, routing,
  `scopeClassName`) — the tour mechanism itself is `@merqo/ui`'s own tests'
  job.
- `tour-steps.ts` — `tourSteps()`: pure step config (element selector +
  title + description) for the dashboard tour, kept free of any `driver.js`
  import so it's still node-unit-testable. The account-menu step targets
  `[data-tour="nav-account"]` — `@merqo/ui`'s `AccountMenu` trigger's own
  hardcoded anchor, not a Merqo-chosen name. The "your kits" step's
  description embeds a `.tour-example` HTML snippet (styled in
  `src/app/globals.css`, rendered via driver.js's own `innerHTML` popover)
  showing a realistic kit-card preview, same pattern as every other kit's
  first tour step — its plan-tier pill renders the real `Badge` component
  (`renderToStaticMarkup`) instead of a hand-copied color, so it can't
  drift from what the badge actually looks like; see
  `../../../docs/superpowers/specs/2026-08-25-tour-example-badge-drift-fix-design.md`
  (workspace root, cross-kit).
- `tour-steps.test.ts` — unit tests asserting the step list.
- `nps-card.tsx` — `NpsCard({ title, scores })`: renders an NPS score plus
  breakdown for the admin feedback page.
- `brand/wordmark.tsx` — the single Merqo wordmark used by landing, account, admin and error surfaces.
- `providers.tsx` — `Providers`: app-wide client providers (Radix
  `TooltipProvider`, `sonner` `Toaster`).
- `dashboard/` — components specific to the vendor dashboard. See its own
  README.
- `landing/` — components specific to the marketing landing page. See its
  own README.
- `ui/` — the shadcn/ui primitive library everything else in this tree is
  built from.

## Connectivity

`dashboard-nav.tsx` and `dashboard-tour.tsx` are thin wiring layers over
`@merqo/ui`'s shared `DashboardNav`/`DashboardTour` — see the root
[README.md](../../README.md) for what else `@merqo/ui` provides and where
each piece is used. `InfoTooltip` and `Section` (formerly local
`info-tooltip.tsx`/`section.tsx`), `ImageUploader` (formerly local
`image-uploader.tsx`), and — since 2026-09-16 — `ElevatedCard`,
`SOCIAL_LINK_FIELDS`, and `SocialLinksFields` (formerly local
`elevated-card.tsx`, `social-icons.tsx`, `social-links-fields.tsx`) are now
imported directly from `@merqo/ui` at their call sites instead of living
here — see `src/app/login/README.md` and `src/app/profile/README.md` for
where each is used. `FeedbackForm`/`SupportForm` (formerly local, opened
from the account menu's Sheets) are gone entirely — `@merqo/ui`'s
`AccountMenu` owns that Sheet chrome directly now.
`dashboard-nav.test.tsx`'s menu-order test now expects a "Theme · System"
entry, matching `@merqo/ui` v0.19.0's collapsed theme submenu.

## Parent

See the repo root [README.md](../../README.md) for the full `src/` layout.

## Boundary and coverage

Account and tour components adapt shared UI contracts to Merqo actions. Authentication and authorization remain in server actions; adapter tests cover redirect control flow, rejected actions and error recovery rather than treating a rendered button as an authorized operation.
