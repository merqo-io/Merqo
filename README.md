# Merqo

House brand + operator console for a modular family of small-business tools
("kits") for Singapore micro/small sellers. `qkit` (queue/orders), `loopkit`
(stamp-card loyalty), `paykit` (payments), and `stockkit` (inventory).
`qkit` is in pilot; the others are in build (see `src/lib/kits.ts`).

This app is the public brand landing plus a role-gated operator console:

- `/dashboard` — cross-product metrics overview (post-login home)
- `/admin/vendors` — grant/revoke kit access per vendor, plus subscriptions, event passes and the entitlements pushed to each kit
- `/admin/requests` — plan-change requests vendors raised from their dashboard
- `/admin/team` — manage Merqo-team members
- `/admin/products` — per-kit health from the metrics API
- `/admin/feedback` — vendor NPS + comments per kit
- `/admin/activity` — the admin-audit trail (every real mutating admin action)
- `/about` — public "Why Merqo" page: the qkit origin story and a
  founder/business-name line matching `/legal/terms`'s phrasing

Each kit runs its own app on its own schema in a shared Supabase project.
Merqo pulls per-kit metrics over an HTTP API (bearer secret) — it never
queries another kit's schema directly. Brand theme is "Harbour Control"
(harbour-navy primary, buoy-amber accent) as of 2026-08-19, replacing
"Control Room" (pine-green + marigold-gold) — see `globals.css`'s own
header comment. `src/lib/brand-mark.ts`'s ImageResponse-generated
favicon/apple-touch-icon carries the same rebrand. Dark mode moved from a
pure OS-media-query to a `.dark`-class-based approach (`@custom-variant
dark`), driven by `next-themes`' `ThemeProvider` wrapping the root layout,
so `@merqo/ui`'s `AccountMenu` (v0.18.0, collapsed into a "Theme · {current}"
submenu as of v0.19.0) now exposes a manual Light/Dark/
System control on top of the existing OS-auto behavior. In production, every kit's auth
cookie is scoped to `.merqo.io` (`NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`,
`src/lib/supabase/`), so signing in on one kit signs you in on the rest —
unset in dev/preview, where each kit still runs on its own `*.vercel.app`
host. Kit links (`src/lib/kits.ts`) default to each kit's
`https://<kit>.merqo.io` host; `NEXT_PUBLIC_<KIT>_URL` overrides one. The dashboard's onboarding tour (`src/components/dashboard-tour.tsx`)
stamps its "seen" state as soon as it auto-runs rather than when it
finishes, so a refresh mid-tour can't make it re-trigger on the next load —
and since that client-fired stamp is fire-and-forget and can be aborted by
a hard navigation (the tour's own steps spotlight `@merqo/ui`'s
`AccountMenu` trigger, whose dropdown renders links as plain `<a>` tags),
`/dashboard`'s own server render (`src/app/dashboard/(app)/layout.tsx`)
also stamps it synchronously, durably, as part of the request. The tour's
"your kits" step now spotlights the active-kit grid (`data-tour="kit-cards"`)
with an inline example kit-card preview in its description, the same
example-card treatment every other Merqo kit's own onboarding tour carries
on its first step — that preview's plan-tier pill renders the real `Badge`
component instead of a hand-copied color, so it can't drift from what the
badge actually looks like — see
`../docs/superpowers/specs/2026-08-25-tour-example-badge-drift-fix-design.md`
(workspace root, cross-kit spec). The landing footer matches qkit's exactly
(single-row wordmark/tagline/credit-line/sign-in link, no CTA band above it).

`@merqo/ui` is pinned at v0.44.2 (`d363250`). Button, input, label, select, switch and tooltip come from `@merqo/ui/primitives`; only the badge stays local, for its `gold` variant. The admin console passes `collapseBelow="xl"` to `DashboardNav` so its eight links collapse into the burger menu below 1280px instead of overflowing.

Merqo uses `@merqo/ui`, the shared component package for the kit family (see
qkit/loopkit/paykit/stockkit for the same dependency). `/about`'s own story
is now `@merqo/ui`'s shared
`AboutMerqo` component (`v0.25.0`), the same content every kit's own
`/about` page renders. `LegalDocument` (every `/legal/*` page) gained a
"← Back" button in the same release. As of `v0.24.0`, `TermsAcceptanceCheckbox` no longer
collects a typed legal name — just the agree checkbox — since a plain
ToS/Privacy clickwrap doesn't need a signatory name for evidentiary
strength beyond the existing acceptance record (see `/legal/accept`'s
own README). `useAsyncAction`, `InfoTooltip`, `Section`,
`TwoColumnSections`, `ImageUploader`, and `DashboardTour` are used directly
or through a thin per-app adapter (`src/hooks/use-async-action.ts`,
`src/lib/image-upload-adapter.ts`, `src/components/dashboard-tour.tsx`).
`dashboard-nav.tsx` composes `@merqo/ui`'s `DashboardNav` for **both** the
vendor dashboard and admin-console headers (burger, inline links, account
menu, kit switcher on the dashboard), and both layouts end with the landing
`Footer` without its sign-in link. The profile and vendor-detail pages use
`BackButton`. The profile page composes shared Section, TwoColumnSections, ImageUploader and SocialLinksFields in route-local sections. Each section owns its save state and retains its distinct server-action or Supabase Auth contract.
`@merqo/ui`'s `AccountMenu` hardcodes its Profile link to
`/dashboard/profile`; `src/app/dashboard/profile/page.tsx` redirects that
to Merqo's real, persona-shared `/profile` route. The landing nav
(`src/components/landing/nav.tsx`) is built on `@merqo/ui`'s `LandingNav`
shell (`wordmark`/`end` slots), added in v0.9.0. v0.10.0 added an optional
`LinkComponent` prop to `AccountMenu`/`DashboardNav` so Next.js consumers can
opt their internal nav links out of a plain `<a>`'s full page reload;
`dashboard-nav.tsx` passes `LinkComponent={Link}` (`next/link`).

`@merqo/ui` bumped to v0.32.0 (2026-09-22), for currency. It adds
`ImageUploader`'s `deferUpload` mode (upload on save instead of on pick);
this app doesn't need it, because its only uploader is the profile icon,
which saves the moment an image is picked.

`@merqo/ui` bumped to v0.31.4 (2026-09-22), for its new
`storagePathFromPublicUrl`. Replacing or removing a profile icon now deletes the
old image from storage (`removeReplacedAvatar` in
`src/lib/image-upload-adapter.ts`); before this, every avatar change orphaned one
file, because `ImageUploader` names each upload randomly.

`@merqo/ui` bumped to v0.31.3 (2026-09-22), which also stops `resizeToWebp`
mislabelling a PNG as WebP on browsers that cannot encode WebP; the public
`vendor-avatars` bucket now enforces 5 MB and JPEG/PNG/WebP itself (migration
`0030`). Before that, v0.31.2 (2026-09-19), from v0.29.3. v0.31.0 replaced
the package-wide `"use client"` banner with per-module directives, so a
plain-data export is a real value inside a Server Component rather than an
opaque client-reference stub — the root cause of the 2026-09-18 RSC crashes
across the kits. It also promoted four modules merqo had its own copy of:
`safeRedirectPath`, `resizeToWebp`, `BackToTop` and `GoogleMark`. The
landing `Footer` is now a thin adapter over the shared one, passing
`copyright` and `signInLabel` overrides so the hub keeps saying
the current-year Merqo copyright and "Sign in →" rather than a kit's "a Merqo kit" /
"Vendor sign in →"; rendered output is unchanged. v0.31.1 fixes a latent
`resizeToWebp` bug where a dotless filename yielded the whole name as its
extension. Which repo uses which shared export is tracked in
`../merqo-ui/docs/usage-matrix.md`.

## Stack

Next.js 16 · App Router · Turbopack · TypeScript strict · Tailwind v4 ·
shadcn/ui (new-york) · Zod · Supabase (`@supabase/ssr`) · Vitest ·
Playwright · pnpm 11 · Node ≥24 · deploy target: Vercel

## Commands

```bash
pnpm dev          # dev server — http://localhost:3000
pnpm build        # production build
pnpm test         # run test suite (vitest)
pnpm test:e2e     # playwright public smoke (admin flows wait for confirm dialogs to close)
pnpm check        # prettier --check + eslint + tsc --noEmit
pnpm format       # prettier --write
pnpm check:legal-versions  # compare actual legal versions at each product's locked UI commit
pnpm dlx knip@6.44.2 --no-progress  # unused files, exports and dependencies (config: knip.json); last run in docs/meta/2026-10-24-fresh-eyes-sweep.md
```

## Dependencies

`pnpm-workspace.yaml`'s `overrides` block pins transitive deps (postcss,
nanoid, undici, fast-uri, js-yaml, brace-expansion, minimatch, sharp) past known CVE
thresholds — `.claude/deps-gate.sh` (CI's `security.yml` `audit` job, a
fail-closed `pnpm audit --prod` high/critical gate) hard-gates on these. When a new advisory lands on a transitive
dep, bump its floor here rather than waiting on the upstream package to
update; a floor set too low silently stops helping once a newer vulnerable
release ships within the allowed range.

## File layout

```
src/app/                    — app router (landing, dashboard, admin console, server actions)
src/app/page.tsx            — public brand landing with session-aware CTAs
src/app/dashboard/          — vendor dashboard: (app)/ (overview + kit discovery,
                               open to every signed-in user)
src/app/admin/              — Merqo-team console: overview (page.tsx) + vendors/, requests/, team/,
                               products/, feedback/, activity/ (all auth-gated)
src/app/profile/            — shared account page (signed-in gate only — reachable from
                               both the vendor dashboard and the admin console)
src/app/login/              — email/password sign-in
src/app/api/telegram/webhook/ — merqo's own Telegram bot's webhook (customer connect)
src/app/api/plans/          — public cached GET /api/plans plan catalog for kit plan pages
src/app/api/merqo/          — bearer-secret endpoints qkit/loopkit call INTO merqo
src/proxy.ts                — Supabase session refresh + route guard (Next 16)
src/components/landing/     — landing sections (nav, hero, kit-stacker, …)
src/components/dashboard/   — dashboard widgets (stat cards, kit discovery/preview cards)
src/components/brand/       — shared Merqo wordmark
src/hooks/use-async-action.ts — shared pending/error state for server-action buttons
src/lib/kits.ts             — kit family config (landing roadmap source of truth)
src/lib/metrics-client.ts   — fetch of a kit's HTTP metrics endpoint
src/lib/vendor-activity-client.ts — fetch of a single vendor's per-kit triage status/metrics/incidents
src/lib/tenant-health.ts    — getTenantHealth: pooled cross-kit incident roll-up for /admin/products
                               (admin/vendors/[email]'s Activity cards)
src/lib/entitlements/     — derive what a vendor may use per kit from subscriptions + event passes, push it to the kits
src/lib/schemas.ts          — Zod schemas for the profile page's forms
src/lib/merqo-vendor-profile.ts — typed wrapper over the shared vendor_profile RPCs
src/lib/supabase/           — browser / server (schema=merqo) / service-role clients
supabase/migrations/        — SQL schema (merqo.* tables) + RLS + grants; 0037 adds pg_cron retention purges
supabase/seed/staging-registry.sql: one-time staging registry wiring (docs/STAGING.md)
scripts/staging-migrate.sh: applies migrations to the staging project with psql
scripts/check-legal-version-skew.mjs — asserts merqo + all 5 kit repos pin
                               matching terms/privacy/pilot versions from exact locked UI commits
scripts/schema-fingerprint.sql, scripts/drift-compare.mjs — schema drift check, line endings ignored (docs/SCHEMA-DRIFT.md)
scripts/schema-drift-known.txt — accepted-drift list for that check (names are full signatures; the compare rejects duplicates)
```

## Data model

One shared Supabase project, schema per kit. Merqo owns `merqo.*`:
`merqo_team` (team membership), `products` (kit registry + per-product
`metrics_secret`), `vendor_links` (vendor↔kit access, email-keyed),
`plans` (the single price catalog: ladder, bundle and Event Pass, public
read of active rows), `subscriptions` (one per vendor and plan, with a
locked price and kit snapshot), `billing_credits` (proration credits),
`customers` (cross-kit customer identity — phone-keyed OR Telegram-chat-keyed
per vendor since the 2026-08-16 widening, the shared counterpart to
`vendor_profile`, reachable only through `upsert_customer` and three
Telegram-identity SECURITY DEFINER functions, called by qkit/loopkit),
`telegram_link_tokens` (short-lived deep-link tokens for merqo's own
customer-facing Telegram bot, service-role only), `admin_audit` (every real
mutating admin action — kit-access grant/revoke, team add/remove, the
bundle-discount toggle, support-message resolution — recorded via
`recordAudit()`; immutable at the grant level, no `update`/`delete` grant
to any role; surfaced on `/admin/activity`). Merqo also hosts that
bot's webhook plus two bearer-secret endpoints qkit/loopkit call into —
the first kit → merqo HTTP direction in this codebase (see
`docs/superpowers/specs/2026-08-16-customer-telegram-connect-design.md`).
RLS defaults to deny. Vendors can read their own `vendor_links`; registry
secrets and administrative writes use server-only service clients, so
`metrics_secret` never reaches a browser.

## Docs

- Public waitlist: an unticked general-updates checkbox is recorded in `merqo.marketing_consents` (migration `0040`) with the wording shown and the time, only when ticked. The founding offer copy is conditional: Merqo is free during the pilot, and launch pricing and any incorporation are stated only as "if".
- The public waitlist page shows a founding merchant offer (first 15 merchants, launch pricing locked for 12 months, nothing to pay today) and states that Merqo is a sole trader, not yet registered with ACRA.
- Vendor admin page: dates are shown in Singapore time, and each kit's last entitlement push shows its failure kind (migration `0039`).
- printkit receives entitlement pushes as a `push_only` product (migration `0042`); it is not grantable and stays out of the dashboard, metrics and the grant list.
- Event passes can be settled on the vendor page once they end (migration `0043`): cups come live from qkit and the team records the offline top-up; Merqo charges nobody.
- Admin nav is Overview, Vendors, Requests and Products; Team, Feedback and Activity sit in a "More admin pages" row that marks the current page, and `/admin/health` redirects to `/admin/products`.
- Browser tabs read `<page> | merqo`; the dashboard (`Kits`) and profile (`Profile`) pages set their own titles.
- The terms gate at `/legal/accept` has a Sign out button, so a user who declines the updated terms can leave.
- Changelog: `CHANGELOG.md` (the top paid tier is labelled Pro, stored `qkit` unchanged; includes the new admin-audit trail, plus a fix
  restoring card/background contrast in both modes after the Harbour
  Control rebrand had accidentally collapsed them to the same color and a
  follow-up dark-mode brightness bump, a fix routing every signed-in
  landing CTA through `/post-login` instead of straight to `/admin`,
  founder Telegram alerts on any kit's help/feedback submission, a
  fix to that alert's own setup runbook (it was missing the step where
  you message the bot first), and security bumps of `next` to `16.3.4`,
  `browserslist` to `4.28.9`, and `vitest` to `4.1.11`, and a `vitest.config.ts`
  `testTimeout` bump from 10s to 30s fixing a real test-isolation leak where a
  timed-out test skipped its cleanup and bled a stale render into the next test)
- Agent reference docs split out of `AGENTS.md`: `docs/FILE-LAYOUT.md`,
  `docs/DATA-MODEL.md`, `docs/meta/ai-harness-reference.md` and
  `docs/meta/templatecentral-adoption-log.md`.
- Deploy runbook: `docs/DEPLOY.md`. Git deploys only `main` (`vercel.json`
  `git.deploymentEnabled` turns every other branch off, previews included);
  staging deploys through the `staging-sync` deploy hook and on-demand
  previews come from the `vercel` CLI.
- Staging setup, the env model, the rollout checklist for every kit and the
  migration gate: `docs/STAGING.md`. `.gitattributes`
  keeps `*.sh` on LF line endings so the staging script runs in a Linux
  container from a Windows checkout.
- The `staging-sync` workflow pushes to `staging` with a `merqo-staging-sync`
  GitHub App token (a ruleset limits that branch to the app); see
  `.github/workflows/README.md`.
- Schema drift check (fingerprint SQL, compare script, owner runbook):
  `docs/SCHEMA-DRIFT.md`
- Security records (data inventory, incident response runbook, subprocessor
  list, Do Not Call statement): `docs/security/`
- Plans/specs: `docs/superpowers/`
- AI harness/hooks/skills map: `.claude/README.md`

See `AGENTS.md` for full engineering rules, harness details, and skills.

### Complete administrative reads

Vendor grants, product options, team memberships and open support messages read
all API pages in stable order. Incomplete reads fail rather than showing partial
administrative data. Email resolution queries only referenced auth user IDs in
batches of eight; adding a team member by email retains full directory pagination.
Recent audit entries remain intentionally limited by the requested history size.
These offset-based lists are operational views, not transactionally consistent
accounting snapshots.

The legal rollout check reads each product's lockfile and uses the sibling
`merqo-ui` Git checkout to inspect its exact committed legal constants. Fetch
any missing locked commit before running the check. Different UI releases are
allowed when the legal document versions match. Git uses its standard installed
path (Windows: `C:/Program Files/Git/cmd/git.exe`; Unix: `/usr/bin/git`).

The shared UI dependency is pinned to immutable commit 7b386558af36a1cbf008a9b4c4073c07ffc105ba, tagged `v0.34.2`, carrying the reviewed upload lifecycle, storage URL validation and safe money parsing fixes. Since `v0.32.1`, `Section` title tooltips and default-mode `InfoTooltip`s open on a tap as well as on hover and keyboard focus. Since `v0.32.2` every info icon also takes taps through a 44px touch area on touch devices. Since `v0.32.3` a long tooltip wraps inside the viewport. Since `v0.34.2` a server action that ends in `redirect()` counts as navigation, not an error. pnpm 11.10 permits preparation only for that exact locked source URL; update the dependency and its build allowlist together.

The AI harness follows templateCentral 7.2.2: hook commands are anchored on the project directory, and the guard against committing to `main` reads the branch of the directory a command runs in (a strict `&&` chain only by the directories git runs in). The dependency audit is the fail-closed `.claude/deps-gate.sh`, with expiring suppressions only in `.claude/dep-audit-allow.txt`. The dated entry in `AGENTS.md` lists what was adopted.

## Security headers and MFA

`src/proxy.ts` sets the CSP (nonce on per-request routes) and `X-Robots-Tag` on non-production deployments. The operator console requires TOTP MFA; see `src/app/mfa/README.md` and `docs/security/`. The MFA form and the wordmark are thin wrappers over `@merqo/ui`.

## Lint

`eslint.config.mjs` consumes the shared `@merqo/ui/eslint` preset (comment and directive hygiene, size and complexity limits, no colour literals or em dashes in `src`). `eslint.config.test.ts` asserts the key rules stay at `error`. Colour literals are allowed only in `src/lib/brand-icon.tsx` and `src/app/global-error.tsx`.

Public and kit-facing entry points are rate limited by a Postgres-backed counter (src/lib/rate-limit.ts, a thin wrapper over `@merqo/ui/kit-api`); see src/lib/README.md for the limits.

Shared pieces come from `@merqo/ui`, and `merqoNoLocalCopies()` in `eslint.config.mjs` fails lint when a local copy of one returns. Kept on purpose through its `allow` list: the Supabase client, server and middleware wrappers and `rate-limit.ts` (they bind merqo's env, schema and counter store), the `dashboard-nav` and `dashboard-tour` wrappers, the `use-async-action` adapter and `components/ui/badge` (gold and soft destructive variants).

Kit bearer routes now cap free-form string lengths (see `src/lib/kit-route-limits.ts`); `legal-accept` truncates an oversized `user_agent` to 512 instead of rejecting it.

Error copy across the console is action-specific ("Could not <action>. Try again.") and raw errors are logged server-side rather than shown; see CHANGELOG.md.

Sign-in and profile error copy is plain and action-specific; `src/lib/auth-error-copy.ts` maps known Supabase auth messages to friendly text and logs only an error code.

## Touch targets and loading states

`src/app/globals.css` raises buttons (except link-style) and inputs to a 44px minimum height, and icon buttons to 44px wide, under `@media (pointer: coarse)` only; desktop sizes are unchanged. Route `loading.tsx` skeletons are `role="status"` regions with an `sr-only` label and no pulse under reduced motion.

Admin pages use a shared header pattern and per-route titles (see `src/app/admin/README.md`).

Admin and Telegram user-facing copy uses plain sentences, "Could not" wording and no em dashes.
