# Documentation

- DEPLOY.md describes Supabase/Vercel setup and the shared Telegram bot. Users must initiate contact with that bot before it can message them; private chat IDs identify the same user across bots.
- TELEGRAM.md is the bot's day-2 runbook: where the token and webhook secret live (the token is stored twice), the health check, token and webhook-secret rotation, bot ownership, and why staging runs with Telegram off.
- STAGING.md is the staging environment runbook: the staging Supabase project, the `staging` branch and its subdomain, `Preview` env vars, the env model (shared variables split Production/Preview, per-project staging secrets), seeding, the end-to-end check, the rollout checklist for the other four kits, and the staging-first gate for migration-bearing PRs.
- SCHEMA-DRIFT.md is the schema drift runbook: run the fingerprint SQL on staging and production and compare it with the CI-built expected fingerprint.
- audit-checkpoint-2026-10-09.md records the product review and validation limits.
- security/ holds the personal-data inventory and its proposed drop list (nothing is dropped until the owner approves).
- meta/ holds standing operational and product notes.
- superpowers/plans/ and superpowers/specs/ retain dated implementation and design evidence. They describe the decisions at that time; current source, migrations and root documentation establish present behavior.

Founder Telegram alerts use the Vault setup described in DEPLOY.md. The migration does not send messages until its required configuration exists. Do not add tokens or private contact details to documentation.
