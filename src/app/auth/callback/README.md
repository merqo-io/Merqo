# callback

## Purpose

Supabase auth callback: exchanges the OAuth or recovery code for a session, then redirects.

## Contents

- `route.ts`: `GET`. Parses the `code` and `next` query values with `authCallbackQuerySchema` and `redirectPathSchema`. A missing, oversized or failing code goes to `/login?error=oauth`; `next` is followed only when it is a same-origin relative path, otherwise the role-aware `/post-login`.
- `route.test.ts`: missing and oversized codes, protocol-relative and backslash `next`, a same-origin `next`.

## Parent

[auth](../../README.md)
