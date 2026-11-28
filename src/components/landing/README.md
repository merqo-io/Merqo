# landing

## Purpose

The public brand landing page (`src/app/page.tsx`), broken into one section
per file. Presentational only — no data fetching, no client state beyond the
`authed` prop threaded down from the page for the nav/CTA sign-in links.

## Contents

- `nav.tsx` — sticky top nav built on `@merqo/ui`'s shared `LandingNav` shell
  (`wordmark`/`end` slots): `Wordmark` as the wordmark slot, the `links` prop (Kits at `/#kits`, About, FAQ: inline from 640px, a burger menu below it so the header stays one line at 375px), and a sign-in/dashboard link
  (`Sign in` when signed out, `Dashboard` when signed in, both linking to
  `/post-login` — the single role-routing funnel — never straight to
  `/admin`) as the end slot. The signed-in end is `@merqo/ui`'s `LandingAccountNav` (Dashboard link, account menu with Switch products, help and feedback), fed by `toNavUser`, with no `LinkComponent` (`next/link` is not serializable from a Server Component; `AppLinkProvider` in the root layout supplies it); `Nav` takes `user` (a `NavUser`) rather than the old `authed`/`account` pair. Header padding/logo size (`px-5 py-4`,
  `text-3xl`) matches qkit's landing nav exactly.
- `hero.tsx` — headline, paragraph and CTAs (same `/post-login` routing as `nav.tsx`). The product object is `kit-switcher.tsx`.
- `kit-switcher.tsx` — client group of `aria-pressed` toggle buttons over `KITS` (each 44px tall). Server-renders qkit; every other kit shows its `KIT_STATUS_LABEL` and `KIT_STATUS_EXPLAINER`, so in-build kits never read as live.
- `kit-journey.tsx` — client three-step `Journey` (`id="kits"`) on the shared `@merqo/ui` pieces. Watch builds qkit into the stack from scroll position (`useScrollPlay`, rewinds on scroll up). Tap adds in-build kits with `PressButton`, each block linking to its waitlist, plus Reset; reduced motion rests on the full stack. Manage lists every kit.
- `faq.tsx` — three `FaqRows` plus a link to `/faq`, which still answers the longer list.
- `closing.tsx` — `ClosingCall` with `PRICING_LINE` and the sign-in or dashboard CTA.
- `footer.tsx` — single-row site footer matching qkit's landing footer
  exactly — `Wordmark`, tagline, `© <year> Merqo` credit line (no "· a
  Merqo kit" suffix — Merqo is the parent, per the landing-page standard),
  an `/about` link, a `/faq` link (via `faqHref`), `@merqo/ui`'s `LegalFooterLinks` (Terms/Privacy,
  linking to `/legal/terms` and `/legal/privacy`), `Sign in →` link. No
  bottom call-to-action band above it (removed to match qkit, which never
  had one).
- `footer.test.tsx` — asserts the wordmark link, tagline, copyright line,
  sign-in link, the About and FAQ links, and the Terms/Privacy footer links all
  render.
- `waitlist-form.tsx` — kit picker + email capture for the in-build kits, with
  the "We may email you" notice; rendered by `/waitlist`.
- `@/components/brand/wordmark` — the shared Merqo brand mark.
- `BackToTop` — shared scroll-to-top control imported from `@merqo/ui`.

## Connectivity

Assembled by `src/app/page.tsx` in the order listed above (nav → hero →
kit-journey → faq → closing → footer →
back-to-top), plus a sticky mobile CTA bar rendered directly in `page.tsx`.

## Shared package note

`back-to-top.tsx` moved to `@merqo/ui` (v0.31.0) as `BackToTop`. `footer.tsx` is now a thin adapter over the shared `Footer`, passing merqo's wordmark plus `copyright` and `signInLabel` overrides — merqo is the hub rather than a kit, so it says "© 2026 Merqo" and "Sign in →" where a kit says "a Merqo kit" and "Vendor sign in →". Both props exist for this; the rendered output is unchanged, and `footer.test.tsx` passes untouched. `showSignIn` (default true) lets the dashboard and admin layouts reuse it without the sign-in link.

`waitlist-form.tsx` also renders the unticked "Also send me occasional Merqo updates." checkbox.

## Parent

[components](../README.md)

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.
