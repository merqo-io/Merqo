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
- Revenue: the page also shows the total received since the window start (1
  January of the Singapore year when unset), the typed cap, percent used,
  remaining and a status (No cap set, Under cap, Near cap from 80%, Over cap from
  100%), plus the latest payments. The cap is only ever a value the owner enters.
- `revenue-form.tsx`: `RevenueCapForm`, sets or clears the cap (S$) and window.
- `payment-form.tsx`: `PaymentForm`, records a payment by vendor email (the
  vendor page passes `fixedEmail`).
- `payment-list.tsx`, `delete-payment-button.tsx`: the ledger rows and a
  confirmed delete.
- `payment-actions.ts`: `setRevenueCapAction`, `recordPaymentAction`,
  `deletePaymentAction`. Zod-validated, amounts converted to integer cents,
  `requireMerqoTeam`, audited without the cap amount.
- `page.test.tsx`, `billing-form.dom.test.tsx`, `actions.test.ts`,
  `payment-actions.test.ts`, `payment-forms.dom.test.tsx`: cover them.

## Parent

[admin](../README.md)

Money shows through `formatMoney` and relative times through `Timestamp`, both from `@merqo/ui`; there are no local copies of either.
