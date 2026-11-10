# post-login

## Purpose

Single route handler that decides where a user lands after signing in. Password
sign-in, the OAuth callback and password reset all redirect here, so the
role-routing logic lives in one place.

## Contents

- `route.ts` — `GET`: no session redirects to `/login`; a vendor has their kits
  re-synced with `syncVendorKits(..., { force: true })` (bypassing its throttle,
  so a kit joined on its own site shows up at the next sign-in) and goes to
  `/dashboard`; a team member goes to `/admin` without a sync.
- `route.test.ts` — no session, team member (no sync) and vendor (forced sync).
