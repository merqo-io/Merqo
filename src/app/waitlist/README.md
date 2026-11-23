# waitlist

## Purpose

Public waitlist page for the kits still in build.

## Contents

- `page.tsx` — `WaitlistPage`: reads `?kit=` (Zod-validated against the in-build kit slugs, leaving the select empty when missing or invalid) and renders the founding merchant offer block (free pilot, offer conditional on paid plans being introduced, first 20 founding merchants, every kit released in year one, setup done for them, price does not rise, no price figures, no payment taken, not-registered disclosure) and, when readable, a live "X of 20 founder spots left" line ("Founder spots are full" at zero, nothing if the count cannot be read) from `getFounderSpotsLeft()` above `WaitlistForm` inside the landing `Nav`/`Footer`.
- `page.test.tsx` — covers the preselect, the empty fallback, the offer block copy and the spots counter states.
- The page passes `await getLandingNavUser(user)` to `Nav`, so a signed-in visitor sees the account menu, labelled with the stall name, with Sign out.

## Connectivity

Submits through `../actions/waitlist.ts`. Kit landings link here with `/waitlist?kit=loopkit`.

The form has a separate, unticked general-updates checkbox, stored only when ticked (see `marketing_consents`).

## Parent

[app](../README.md)
