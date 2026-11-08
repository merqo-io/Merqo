# Documentation

- DEPLOY.md describes Supabase/Vercel setup (only `main` deploys from git, with previews off) and the shared Telegram bot. Users must initiate contact with that bot before it can message them; private chat IDs identify the same user across bots.
- TELEGRAM.md is the bot's day-2 runbook: where the token and webhook secret live (the token is stored twice), the health check, token and webhook-secret rotation, bot ownership, and why staging runs with Telegram off.
- STAGING.md is the staging environment runbook (staging deploys from pushes to `staging`; on-demand previews use the `vercel` CLI): the staging Supabase project, the `staging` branch and its subdomain, `Preview` env vars, the env model (shared variables split Production/Preview, per-project staging secrets), seeding, the end-to-end check, the rollout checklist for the other four kits, and the staging-first gate for migration-bearing PRs.
- SCHEMA-DRIFT.md is the schema drift runbook: run the fingerprint SQL on staging and production and compare it with the CI-built expected fingerprint. It also covers the accepted-drift list, which is currently empty.
- audit-checkpoint-2026-10-09.md records the product review and validation limits.
- security/ holds the personal-data inventory and its proposed drop list (nothing is dropped until the owner approves).
- FILE-LAYOUT.md maps the source tree (app router, API routes including the public `/api/plans` catalog, libraries, components, migrations).
- DATA-MODEL.md documents the `merqo.*` schema, Telegram identity and vendor-connect tables, and the kit to merqo HTTP direction, plus the Event Pass settle columns (`0043`).
- meta/ holds standing operational and product notes.
- superpowers/plans/ and superpowers/specs/ retain dated implementation and design evidence. They describe the decisions at that time; current source, migrations and root documentation establish present behavior.

Founder Telegram alerts use the Vault setup described in DEPLOY.md. The migration does not send messages until its required configuration exists. Do not add tokens or private contact details to documentation.

`DEPLOY.md` now names the live domains, `qkit.merqo.io` and `www.merqo.io`, instead of the old `*.vercel.app` hosts.

DEPLOY.md step 7 covers printkit: after migration `0042` adds its `push_only` row, set `app_url` and `provision_secret` so entitlement pushes reach it.

Shared UI primitives (button, input, label, select, switch, tooltip) and `cn` now come from `@merqo/ui/primitives`; only `src/components/ui/badge.tsx` remains a local primitive.
