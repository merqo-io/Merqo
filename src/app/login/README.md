# login

## Purpose

Vendor sign-in page — email/password sign-in/sign-up and Google OAuth in a
single client component, matching the login page shape shared across every
Merqo kit.

## Contents

- `page.tsx` — `LoginPage`: `AuthShell`-wrapped form with
  Google OAuth (`signInWithOAuth`, forced `hl=en`), email/password
  sign-in/sign-up via controlled fields and Supabase Auth,
  a "check your email" state for signup confirmation, and forgot-password
  via `resetPasswordForEmail`.

## Connectivity

Uses `AuthShell` (`@merqo/ui`) for the card container; the sign-in/sign-up toggle is its footer.
Successful sign-in/sign-up navigates to `/post-login`, which selects the
account's vendor or team destination.

Google branding uses `GoogleMark` from `@merqo/ui`; Merqo branding uses the single `components/brand/Wordmark`.

## Parent

See the repo root [README.md](../../../README.md) for the full `src/app/`
layout.

`layout.tsx` forces per-request rendering so the nonce CSP from `proxy.ts` reaches this page's scripts.

In sign-up mode a weak password shows the specific failed rule (from the server's `reasons`), and the shared `PasswordRequirementsHint` next to the Password label states the requirements.

Password sign-in runs through the signInWithPasswordAction server action so attempts are counted per IP (10 per 15 minutes, fail open).

The page shows plain "Could not ... Try again." errors through `authErrorCopy` instead of raw Supabase messages.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.

The page reads ?error=link after mount and shows the expired-link message; page.dom.test.tsx covers it.
