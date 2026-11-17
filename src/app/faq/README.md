# faq

## Purpose

The public `/faq` page: short answers about Merqo and its kits, reachable
signed out.

## Contents

- `page.tsx` - `FaqRoute`, an async Server Component. Reflects the session so
  the `Nav` CTA reads "Dashboard" for a signed-in vendor, and wraps
  `@merqo/ui`'s shared `FaqPage` in the same `Nav`/`Footer` as the other
  public pages. `FaqPage` emits the FAQ JSON-LD; no closing line is passed.
- `faq-content.ts` - the title, intro and grouped rows, exported so tests can
  check them.
- `page.test.tsx` - covers the rendered groups and questions, the copy
  guardrails and the nav CTA.

## Connectivity

Linked from `Nav` (`src/components/landing/nav.tsx`).

## Parent

[app](../README.md)
