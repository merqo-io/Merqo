# Documentation

- DEPLOY.md describes Supabase/Vercel setup and the shared Telegram bot. Users must initiate contact with that bot before it can message them; private chat IDs identify the same user across bots.
- TELEGRAM.md is the bot's day-2 runbook: where the token and webhook secret live (the token is stored twice), the health check, token and webhook-secret rotation, bot ownership, and why staging runs with Telegram off.
- STAGING.md is the staging environment runbook: the staging Supabase project, the `staging` branch and its subdomain, `Preview` env vars, seeding, the pilot's end-to-end check, and the staging-first gate for migration-bearing PRs.
- audit-checkpoint-2026-10-09.md records the product review and validation limits.
- meta/ holds standing operational and product notes.
- superpowers/plans/ and superpowers/specs/ retain dated implementation and design evidence. They describe the decisions at that time; current source, migrations and root documentation establish present behavior.

Founder Telegram alerts use the Vault setup described in DEPLOY.md. The migration does not send messages until its required configuration exists. Do not add tokens or private contact details to documentation.
