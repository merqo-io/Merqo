# plans

## Purpose

`GET /api/plans`: the plan catalog, gated by the kit bearer secret
(`MERQO_CUSTOMER_SECRET`) and not public. Kit plan pages fetch it server-side (merqo-ui's `fetchPlanCatalog`) so no kit stores a plan
price.

## Contents

- `route.ts`: returns `{plans:[{slug,kind,name,monthly_cents,annual_cents,kits[]}],
event_pass:{per_cup_cents,min_cents,cap_cents,days}}`. Active rows only,
  cheapest first, event pass terms split out of `plans`. Guarded by
  `guardBearerRoute`, so a missing or wrong bearer gets 401. Dynamic, and every
  response is `Cache-Control: private, no-store`; a failure returns a generic 500.
- `route.test.ts`: auth rejection, response shape, headers and the error path.

## Connectivity

Reads through `@/lib/pricing/public-catalog` with the anon key; RLS exposes
active `merqo.plans` rows only. No secret and no non-catalog column is returned.

## Parent

[api](../README.md)
