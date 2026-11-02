# Database tests

Run the rollback-only pgTAP suites with `supabase test db` against local Supabase. They check database authorization and integrity, which mocked application tests cannot establish. CI's database job applies migrations before running them.

- `rls.test.sql`: table RLS, vendor/team isolation, restricted grants, uniqueness, Telegram consent RPCs, founder triggers, and avatar bucket limits.
- `metric-emitter.test.sql`: service-only metric emission and trusted trigger access.
- `vendor-profile-partial-updates.test.sql`: owner-scoped atomic partial profile writes.
- `vendor-profile-reader-permissions.test.sql`: owner/service profile creation and permitted existing reads.
- `private-helper-acl.test.sql`: private customer synchronization, owner-trigger continuity, and founder helper denial.
- `pricing-catalog.test.sql`: `0036` seeded plan values, plan and subscription CHECKs, the 20-founder cap, one active subscription per vendor and plan, and RLS/grants on plans, subscriptions and billing credits.
- `retention-purges.test.sql`: `0037` purge functions delete or null only rows past retention and are not executable by anon or authenticated.
- `entitlements.test.sql`: `0038` event pass, request and push-log CHECKs (including `0039`'s `last_error_kind`), one pending request per vendor, `user_id_for_email` access, and RLS/grants (vendors read their own passes and requests, only the team reads the push log).
- `db-hygiene.test.sql`: `0035` foreign key indexes, RLS on every table, and `admin_audit` access (no anon access, team-only reads, no client writes).

The latest prepared migrations and fixtures still need local database execution; their presence is not a passing runtime result. Keep fixed pgTAP plans aligned with assertion counts; focused suites using `no_plan()` report their count automatically.

[Repository README](../../README.md)
