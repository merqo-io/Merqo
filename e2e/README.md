# e2e

## Purpose

Playwright public smoke tests — the app boots and the landing/login pages
render without any Supabase provisioning. Runnable with only `pnpm dev` +
`playwright install`.

## Contents

- `smoke.spec.ts` — login page renders; landing renders with a "Sign in"
  action and the interactive kit stacker; a signed-out visitor hitting
  `/dashboard` is bounced to `/login`. Also gates an `authed areas` block
  behind `MERQO_E2E_AUTH=1` (CI's `e2e-admin` job only): admin
  overview/vendors/products/team/activity pages render, granting/revoking a
  vendor's kit access round-trips through the real admin-audit trail
  (checked on `/admin/activity`), and adding/removing a team member works.
- `csp.spec.ts` — a dynamic page serves a nonce CSP with nonced scripts and no violations; a static page keeps the static CSP.
- `signed-in-smoke.spec.ts` — `renderSmoke` over every dashboard and admin page (including `/admin/health`) as the MFA-cleared team member; a password-only session is sent to `/mfa`.
- `global-setup.ts` + `totp.ts` — sign in once, enrol an authenticator through `/mfa`, save the `aal2` session for authed tests.

## Parent

[Merqo](../README.md)
