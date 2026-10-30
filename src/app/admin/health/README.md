# health

## Purpose

Tenant observability for the Merqo team: which vendors had failed payments,
prints, webhooks or action errors in the last 72 hours, or have work stuck or
needing attention, on any kit they are active on. Read-only; drill into a
vendor from here to see the per-kit incident detail.

## Contents

- `page.tsx` — `AdminHealthPage` (`revalidate = 0`). Team-gated
  (`requireMerqoTeam`). Reads the live kit registry and vendor grants, passes
  each vendor's `active` kit slugs to `getTenantHealth()` (`@/lib/tenant-health`),
  and renders the result in `@merqo/ui`'s `DataTable`: vendor email (links to
  `/admin/vendors/[email]`), an overall badge (`attention` or "No data" when no
  kit answered), one column per live kit (the kit's `StatusBadge` plus an
  incident count, "No data" when that kit failed or timed out, "-" when the
  vendor is not active on it), and the most recent incident time.
- `page.test.tsx` — mocked coverage: only active kits are passed to
  `getTenantHealth`, rows link to the vendor page, a timed-out kit cell shows
  "No data", and the empty state.
- `loading.tsx` — table-shaped skeleton (`loading.test.tsx` checks its width).

## Data

`getTenantHealth` calls each kit's `/api/merqo/vendor-activity` (6 at a time,
3000 ms timeout each) and keeps only vendors whose `worst` is `attention` or
`unknown`. Payloads carry incident kinds, counts, reference ids and codes only;
no names, phones, messages or amounts reach this page.

## Parent

[admin](../README.md)
