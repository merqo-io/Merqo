# pricing

## Purpose

Merqo's plan catalog and price math. `merqo.plans` is the single source of
plan prices; this folder loads it and does the integer-cent arithmetic that
billing will build on. Nothing here charges anyone.

## Contents

- `calc.ts`: pure functions. `annualCents` (10 x monthly), `coTermProrationCents`
  (kit added mid-term, months left over 12), `aaUpgradeCreditCents` (unused
  annual months over 12, spent on All-Access months first), `eventPassChargeCents`
  and `eventPassSettleCents` (per-cup rate clamped to min..cap; settle is the
  total minus the prepaid minimum), `eventPassTopUpCents` (total minus what the
  pass actually prepaid, floored at 0). Fractions of a cent round half up.
- `calc.test.ts`: the approved examples (6000 co-term, 6667 credit, annual
  values, Event Pass minimum, per-cup and cap cases) plus input validation.
- `catalog.ts`: `loadPlanCatalog()` reads `merqo.plans` through the service
  client and returns typed `Plan` objects; `parsePlanRows` validates rows.
- `public-catalog.ts`: `loadPublicPlanCatalog()` reads active plans through the anon client and shapes the `/api/plans` response; `public-catalog.test.ts` covers it.
- `format.ts`: `formatSgd` (cents to `S$16.00`) and `planLabel` (slug to display name, tier slugs labelled through `tierLabel`: `qkit` shows as Pro) for admin screens; `format.test.ts` covers them.
- `catalog.test.ts`: row mapping, event pass terms, query order and errors.

[Parent](../README.md)

`planLabel` maps the stored `qkit` tier to the label Pro itself, since the shared `tierLabel` would capitalise other slugs such as `all_access` wrongly.
