# faq

## Purpose

The public `/faq` page: short answers about Merqo and its kits, reachable
signed out.

## Contents

- `page.tsx` - `FaqRoute`, an async Server Component. Reflects the session so
  the nav shows the account menu (Sign out, labelled with the stall name) via `getLandingNavUser`, and so
  the `Nav` CTA reads "Dashboard" for a signed-in vendor, and wraps
  `@merqo/ui`'s shared `FaqPage` in the same `Nav`/`Footer` as the other
  public pages. `FaqPage` emits the FAQ JSON-LD; no closing line is passed.
- `faq-content.ts` - the title, intro and grouped rows (fourteen, including "Which plan would suit me?", which points to `/which-plan`, and three conditional billing rows: trial, founder offer, pause and grace), exported so tests can
  check them.
- `page.test.tsx` - covers the rendered groups and questions, the copy
  guardrails and the nav CTA.

## Connectivity

Linked from `Nav` (`src/components/landing/nav.tsx`).

## Parent

[app](../README.md)

The kit lists and descriptions include printkit, and the "one sign-in" row answers that each kit runs on its own. The waitlist-email row quotes the form wording "We may email you about this kit." (the landing page shows a 3-row subset of these rows).
