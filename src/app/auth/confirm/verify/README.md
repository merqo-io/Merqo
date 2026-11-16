# verify

## Purpose

POST handler that verifies the emailed token on merqo's own origin.

## Contents

- `route.ts`: `POST` via `handleAuthConfirm`; lands on `/post-login`, recovery links on `/reset-password`, every failure on `/login?error=link`.
- `route.test.ts`: success, recovery, same-origin `next`, failed verification, cross-origin POST.

## Parent

[confirm](../README.md)
