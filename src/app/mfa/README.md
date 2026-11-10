# mfa

## Purpose

Second-step sign-in for the Merqo team. `requireMerqoTeam()` redirects any team
session below `aal2` here, so the operator console is never reachable with a
password alone.

## Contents

- `page.tsx` — server page; `requireTeamMember()` only (it lives outside
  `/admin` so the `aal2` gate cannot loop back), forwards an `aal2` session to
  `/admin`, otherwise passes the verified TOTP factor (or stale unverified ones)
  to the form.
- `mfa-form.tsx` — thin adapter over the shared `MfaForm` from `@merqo/ui`: unenrols stale factors, enrols a TOTP factor, verifies with `challengeAndVerify`, then enters `/admin`. Error copy is unchanged.
- `loading.tsx` — route skeleton shown while the team and MFA lookups resolve.
- `mfa-form.dom.test.tsx`, `mfa-form.shared.dom.test.tsx` — verify, wrong code, rate limit, enrol failure and throw, paste, touch tap, input attributes.
- `loading.test.tsx` — loading announcement and card layout.

## Connectivity

Needs TOTP enrolment and verification enabled in Supabase Auth.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.

## Differences from the former local form

The shared form changes these: pasted text is reduced to six digits; the input gains a placeholder, `name="code"`, `pattern="[0-9]*"`, and `aria-invalid` and `aria-describedby` tied to the error, and non-digits are stripped as typed; the input is disabled while pending; the button reads "Verifying" while pending and ignores duplicate taps; the error clears on edit; thrown errors are shown (as the same wrong-code or setup copy); the QR code renders only for `data:image/` sources.
