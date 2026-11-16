# confirm

## Purpose

Landing page for emailed auth links (`/auth/confirm?token_hash&type&redirect_to`). merqo is the Supabase Site URL, so every kit's links arrive here first. A GET never consumes the token: a Continue button POSTs to `verify/`.

## Contents

- `page.tsx`: forwards a link whose `redirect_to` origin is in `KIT_AUTH_ORIGINS` to that kit's `/auth/confirm` (never calls Supabase); otherwise renders `AuthConfirmForm` or `AuthConfirmInvalid`. Metadata is noindex with `referrer: no-referrer`.
- `page.test.tsx`: forwarding, non-forwarded origins, form and invalid states, allowlist contents.

## Parent

[auth](../../README.md)
