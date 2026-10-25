# src

## Purpose

The merqo application source.

## Contents

- `app/`: the App Router tree (landing, vendor dashboard, operator console, auth, API routes).
- `components/`: landing, dashboard and shadcn UI components.
- `hooks/`: shared client hooks.
- `lib/`: domain logic, Supabase clients and validated boundaries.
- `proxy.ts`: Next 16 proxy. Refreshes the Supabase session, then sets the CSP (a per-request nonce on dynamic routes, the static policy elsewhere) and `X-Robots-Tag` off production. The source lists live in `lib/security-headers.ts`.

## Parent

[Merqo](../README.md)
