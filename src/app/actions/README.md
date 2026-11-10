# src/app/actions

Server Actions for vendor feedback, support messages and the public kit waitlist. Validate payloads before database work, resolve the signed-in actor from Supabase, and keep vendor writes on the session client so RLS checks ownership. Tests cover rejected payloads, authentication failures and database failures.

Kit slugs passed to the upgrade and downgrade actions are parsed with `kitSlugSchema` before any lookup. Both actions only file a `subscription_requests` row for the Merqo team; they never call a kit.

`waitlist.ts` also reads the unticked `updatesOptIn` checkbox (Zod: `"on"` or absent) and passes it on.

The waitlist (5/hour per IP), password sign-in in `auth.ts` (10 per 15 minutes per IP), support and feedback (10/hour per user) actions are rate limited through `src/lib/rate-limit.ts` and fail open if the counter is down.

`waitlist.ts` failures return "Could not join the waitlist. Try again." and log the raw error with `console.error`; the success message is "You're on the list. We'll email you when it opens."

Server Actions here return the shared `ActionResult` from `@merqo/ui/kit-api`.
