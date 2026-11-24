# which-plan

## Purpose

The public `/which-plan` page: suggests a plan for each kind of vendor, reachable
signed out. It states no prices and frames plans as conditional on paid plans
being introduced, since Merqo is free during the pilot.

## Contents

- `page.tsx` - `WhichPlanPage`, an async Server Component. Reflects the session
  through `getLandingNavUser` for the `Nav`, and shows a "Join the waitlist"
  button signed out or "Dashboard" signed in.
- `which-plan-content.ts` - the title, intro, vendor rows, per-plan feature
  words, the conditional "If paid plans are introduced" terms (founder offer,
  trial, pause, grace, manual payment; no amounts) and organiser contact link, exported so tests can check them.
- `page.test.tsx` - covers the rows, plan names, copy guardrails (no `$`, no
  dashes, no price wording) and the CTA.

## Connectivity

Linked from an FAQ row (`src/app/faq/faq-content.ts`).

## Parent

[app](../README.md)
