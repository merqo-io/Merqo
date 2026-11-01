# Incident response runbook

For a solo or small operator running the Merqo kit family (merqo, qkit, loopkit, paykit, printkit, stockkit). All kits share one Supabase project (one schema per kit) and deploy on Vercel. What data lives where: [data inventory](2026-10-24-data-inventory.md). Third parties: [subprocessors](subprocessors.md).

## 1. Detect

Sources, roughly in order of how often they fire:

- `/admin/health` and the admin activity log in merqo (stuck or failing kits, incident lists).
- Vercel deployment and runtime logs; Supabase logs and auth events.
- Sentry alerts (paykit only, if `SENTRY_DSN` is set).
- GitHub secret-scanning, gitleaks and CodeQL alerts.
- Schema drift check (`docs/SCHEMA-DRIFT.md`): unexpected tables, grants or policies.
- A report from a vendor, an end customer or a researcher to legal@merqo.io.

Write the time you became aware in the incident log straight away. The PDPA deadlines run from awareness.

## 2. Triage and severity

| Severity | Meaning                                                                                    | Examples                                                                                | Target response                  |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------- |
| SEV1     | Confirmed or likely personal data exposed or altered; or a secret with write access leaked | Service-role key in a public repo; RLS bypass read in production; database dump exposed | Start now, contain within 1 hour |
| SEV2     | Possible exposure, or a service down for all vendors                                       | Suspicious service-role use; bot token leaked but no abuse seen; all checkouts failing  | Contain within 4 hours           |
| SEV3     | Contained, no personal data involved                                                       | Single vendor misconfiguration; failed login burst blocked                              | Next working day                 |

Decide three things: what data categories, how many individuals, and whether the exposure is ongoing.

## 3. Contain

Rotate first, investigate after. Order by blast radius. After each rotation, redeploy the affected Vercel projects, because env vars apply on the next deployment.

| Secret                                                     | Where it is used                                  | How to rotate                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase service-role key (`SUPABASE_SECRET_KEY`)          | Every kit, server only                            | Supabase dashboard, API keys: create a new secret key, set it in each kit's Vercel env, redeploy all, then revoke the old key. Rotate the legacy JWT secret too if legacy keys were ever in use.                                          |
| Kit bearer secrets (paykit `kit_api_keys`)                 | qkit and other kits calling paykit `/api/v1/*`    | Run `node scripts/create-kit-key.mjs` in paykit to mint a new hashed secret, update the caller's `PAYKIT_KIT_SECRET`, redeploy, then delete the old row. printkit uses `PRINTKIT_KIT_SECRET` and `PRINTKIT_CALLBACK_SECRET` the same way. |
| `MERQO_CUSTOMER_SECRET`                                    | merqo customer endpoints, called by every kit     | Generate a new value, set it in merqo and every kit env together, redeploy all.                                                                                                                                                           |
| `MERQO_METRICS_SECRET`, `MERQO_PROVISION_SECRET`           | merqo calling kit metrics and provisioning routes | Same: one new value, set on merqo and each kit, redeploy.                                                                                                                                                                                 |
| `TELEGRAM_BOT_TOKEN`                                       | merqo bot                                         | Revoke via BotFather (`/revoke`), set the new token in Vercel.                                                                                                                                                                            |
| `TELEGRAM_WEBHOOK_SECRET`                                  | merqo webhook verification                        | Generate a new value, set in Vercel, redeploy, then re-register the webhook with Telegram `setWebhook` using the new secret.                                                                                                              |
| Google OAuth client secret                                 | Supabase Auth                                     | Rotate in the Google Cloud console and the Supabase Auth provider settings.                                                                                                                                                               |
| VAPID private key (qkit), `FEIE_*` printer keys (printkit) | Push notifications, cloud printers                | Regenerate and redeploy. Existing push subscriptions must resubscribe after a VAPID change.                                                                                                                                               |
| Vercel access                                              | Deploys and env                                   | Revoke tokens, review team members and integrations, enable 2FA, check the audit log.                                                                                                                                                     |
| GitHub access                                              | Source and CI                                     | Revoke PATs and deploy keys, review collaborators and Actions secrets.                                                                                                                                                                    |

Also, where relevant:

- Revoke sessions for affected users (Supabase Auth, sign out all sessions).
- Disable a single vendor or kit in the admin console rather than taking everything down.
- Preserve evidence before changing state: export Vercel and Supabase logs, note the time, do not delete rows.

## 4. Eradicate and recover

- Find the root cause (code path, policy gap, leaked secret, compromised account) and fix it in a PR with a test.
- Run the schema drift check to confirm no stray grants, policies or functions remain.
- Restore data from Supabase backups only if data was altered or deleted; confirm the restore point first.
- Redeploy from a known-good commit. Confirm `/admin/health` is green and each kit's smoke path works.
- Keep old secrets revoked, not just replaced.

## 5. Notify (Singapore PDPA)

Under the PDPA data breach notification obligation:

1. Assess whether the breach is notifiable. Complete the assessment within 30 days of becoming aware of it, and record the reasoning either way.
2. A breach is notifiable if it results in, or is likely to result in, significant harm to affected individuals, or is of significant scale (500 or more individuals).
3. Once assessed notifiable, notify the PDPC no later than 3 calendar days.
4. Notify affected individuals as soon as practicable when significant harm is likely: what happened, what data, what they can do, who to contact.
5. Where Merqo handles a vendor's end customer data, tell the affected vendor without undue delay so they can meet their own obligations. This matches the Data breaches section of the privacy policy.

Also consider Telegram or Supabase support if their platform is involved, and the police for criminal activity.

## 6. Post-incident review

Within 7 days of closing the incident:

- Write the timeline, root cause, what worked and what did not.
- Add or change a test, alert, policy or runbook step. Link the PR.
- Update the data inventory and subprocessor list if the scope of data or vendors changed.
- Keep the incident log for 5 years, matching audit log retention.

## Contacts

| Role                                 | Contact                                          | Notes                                                    |
| ------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- |
| Operator and Data Protection Officer | legal@merqo.io                                   | Same address as in the published privacy policy          |
| PDPC (breach notification)           | https://www.pdpc.gov.sg/data-breach-notification | Online notification form                                 |
| Supabase support                     | https://supabase.com/dashboard/support           | Project support ticket                                   |
| Vercel support                       | https://vercel.com/help                          | Account-level ticket                                     |
| Telegram                             | https://t.me/BotSupport                          | Bot abuse or token issues                                |
| Police (cybercrime)                  | https://www.police.gov.sg/iwitness               | Report online                                            |
| Backup contact                       | To confirm                                       | Second person with access to Supabase, Vercel and GitHub |

## Incident log template

Copy into a private note per incident.

```
Incident ID:
Aware at (date, time, timezone):
Reported by / detected via:
Severity (SEV1/2/3):
Kits and schemas affected:
Data categories and approx. individuals affected:
Ongoing? (yes/no):

Timeline
- time: event

Containment actions (secrets rotated, access revoked):
Root cause:
Fix (PR links):

PDPA assessment
- Assessment completed on:
- Notifiable? (yes/no) and reasoning:
- PDPC notified at (if yes):
- Vendors notified at:
- Individuals notified at (if significant harm likely):

Review actions and owners:
Closed on:
```
