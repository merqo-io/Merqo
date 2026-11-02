# src/app/actions

Server Actions for vendor feedback, support messages and the public kit waitlist. Validate payloads before database work, resolve the signed-in actor from Supabase, and keep vendor writes on the session client so RLS checks ownership. Tests cover rejected payloads, authentication failures and database failures.

Kit slugs passed to the upgrade and downgrade actions are parsed with `kitSlugSchema` before any lookup. Both actions only file a `subscription_requests` row for the Merqo team; they never call a kit.
