# [email]

## Purpose

One vendor's detail view in the Merqo-team console: which kits they're
granted, a grant/revoke control per kit, a form to grant a new one, and —
new here — a live cross-kit "Activity" section so an ops person can see
what that vendor is actually doing on each kit without opening every kit's
own admin console separately.

## Contents

- `page.tsx` — `VendorDetailPage` (`revalidate = 0`). Team-gated
  (`requireMerqoTeam`); 404s via `notFound()` if the email has no grant at
  all. Renders the existing Kits list + Grant form, plus a new Activity
  section: for every kit slug the vendor is `active` on (from
  `getVendorGrant`), calls `getVendorActivity()`
  (`@/lib/vendor-activity-client`) in parallel against the live kit
  registry (`listLiveProducts`), and renders one `VendorActivityCard` per
  successful result. A kit with no grant, a kit that 404s/times out, or a
  kit that hasn't implemented `/api/merqo/vendor-activity` yet all just
  render no card — never an error state. After the grant lookup succeeds the
  page calls `recordAudit(user.id, "view_vendor", null, { email_hash })`,
  where `email_hash` is the first 12 hex chars of sha256 of the lowercased
  email, so the audit trail shows who opened which tenant without a second
  copy of the email.
- `page.test.tsx` — mocked-dependency coverage: renders a card only for
  active-status kits (not waitlist), renders no Activity section at all
  when the vendor has zero active kits, and calls `notFound()` when the
  grant doesn't exist. Also asserts a kit card's incident list (with and
  without `incidents`) and that the `view_vendor` audit row is written once
  with the expected hash and never the raw email.
- `vendor-activity-card.tsx` — `VendorActivityCard({ slug, result, now })`.
  Renders nothing when `!result.ok` or the kit reports `active: false`;
  otherwise a `StatusBadge` (skipped entirely when `status` is `null` —
  e.g. loopkit, which has no per-vendor health concept yet), a plan
  `Badge`, the kit's `metrics` rows via `@merqo/ui`'s `StatTile`, and a
  relative "last activity" timestamp, with `IncidentList` between them.
- `incident-list.tsx` — `IncidentList({ incidents, recent, now })` and
  `INCIDENT_LABELS` (human label per `IncidentKind` from
  `@merqo/ui/contracts`). Renders "Incidents (last 72 h)": each kind with a
  count badge and relative last time, then `recent` entries as reference id
  plus code. "No incidents in the last 72 hours" when both are empty or
  missing (a kit that does not report incidents yet).
- `incident-list.dom.test.tsx` — labels, counts, relative time, recent ref
  and code, and both empty-state cases.
- `vendor-activity-status-config.ts` — the shared `StatusBadge` `config`
  for the 6-value cross-kit `VendorActivityStatus` union (from
  `@merqo/ui/contracts`)
  (`attention`/`expiring`/`stuck`/`quiet`/`new`/`healthy`), mapped onto
  merqo's own semantic tokens — unlike each kit's own status-badge (which
  maps onto that kit's own brand tokens), this is merqo's single console,
  so every card reads consistently regardless of which kit it's reporting
  on.

The page header's way back to the vendor list is `@merqo/ui`'s `BackButton`, given `next/link`.

## Parent

[admin](../../README.md)

## Boundary and coverage

The page validates its grant lookup through team-gated helpers. Tests verify that only active grants trigger kit activity calls, while missing grants use the not-found path; failed activity reads do not invent successful metrics.
