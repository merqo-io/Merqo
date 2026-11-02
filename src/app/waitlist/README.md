# waitlist

## Purpose

Public waitlist page for the kits still in build.

## Contents

- `page.tsx` — `WaitlistPage`: reads `?kit=` (Zod-validated against the in-build kit slugs, leaving the select empty when missing or invalid) and renders `WaitlistForm` inside the landing `Nav`/`Footer`.
- `page.test.tsx` — covers the preselect and the empty fallback.

## Connectivity

Submits through `../actions/waitlist.ts`. Kit landings link here with `/waitlist?kit=loopkit`.

## Parent

[app](../README.md)
