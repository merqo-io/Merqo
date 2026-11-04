# plans

## Purpose

`GET /api/plans`: the public, unauthenticated plan catalog. Kit plan pages
fetch it server-side (merqo-ui's `fetchPlanCatalog`) so no kit stores a plan
price.

## Contents

- `route.ts`: returns `{plans:[{slug,kind,name,monthly_cents,annual_cents,kits[]}],
event_pass:{per_cup_cents,min_cents,cap_cents,days}}`. Active rows only,
  cheapest first, event pass terms split out of `plans`. Revalidated every 300s
  with a public CDN `Cache-Control`; a failure returns a generic 500.
- `route.test.ts`: response shape, headers and the error path.

## Connectivity

Reads through `@/lib/pricing/public-catalog` with the anon key; RLS exposes
active `merqo.plans` rows only. No secret and no non-catalog column is returned.

## Parent

[api](../README.md)
