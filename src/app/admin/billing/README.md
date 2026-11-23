# admin/billing

## Purpose

Team-only page for billing settings and the founder offer. Gated by the admin
layout's `requireMerqoTeam()`. Later billing settings belong here.

## Contents

- `page.tsx`: `BillingPage` (`revalidate = 0`). Shows the offer state (open, or
  closed by date or by 20 founders), spots left, the close date (billing open
  date plus 60 days) and the founder price. The price appears in admin only.
- `billing-form.tsx`: `BillingOpenForm`, a date input to set or clear the billing
  open date.
- `actions.ts`: `setBillingOpensAtAction`, Zod-validated, reads the date as a
  Singapore calendar day, writes `merqo.billing_config` through the service
  client and audits `set_billing_opens_at`.
- `page.test.tsx`, `billing-form.dom.test.tsx`, `actions.test.ts`: cover them.

## Parent

[admin](../README.md)
