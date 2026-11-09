# requests

## Purpose

The queue of plan changes vendors asked for from their dashboard
(`merqo.subscription_requests`, one pending request per vendor). The team
resolves a request by making the change on the vendor page, or declines it.

## Contents

- `page.tsx`: `RequestsPage` (`revalidate = 0`, team-gated). Lists pending
  requests oldest first with kind, vendor email, requested plan and note. Each
  row links to `/admin/vendors/<email>?request=<id>` (the vendor page prefills
  the plan and resolves the request when the change is saved) and has a Decline
  control.
- `page.test.tsx`: empty state, a request row with its links, an unresolved
  vendor email.
- `actions.ts`: `declineRequestAction`, zod-validated, team-gated, audited as
  `decline_subscription_request`.
- `actions.test.ts`: decline, bad id, already closed, write failure.
- `decline-button.tsx`: `DeclineButton`, a `ConfirmAdminAction` wrapper.

## Parent

[admin](../README.md)

Page header follows the shared admin pattern (Admin eyebrow, display title equal to the nav label, one-line description) and sets its browser title via `metadata`.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.

Server Actions here return the shared `ActionResult` from `@merqo/ui/kit-api`.
