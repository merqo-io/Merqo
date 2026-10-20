# Staging environment

Staging is a second Supabase project plus a long-lived `staging` branch per app,
so Vercel `Preview` deployments stop reading and writing production data. Design:
`docs/superpowers/specs/2026-09-10-staging-environment-design.md` in the workspace
root. This file is the setup runbook and the day-to-day gate.

**Pilot scope:** merqo and qkit. loopkit, paykit, stockkit and printkit keep
their current Preview setup until the pilot passes its end-to-end check (step 8),
then get the same steps.

## How it fits together

| Piece             | Production                  | Staging                                      |
| ----------------- | --------------------------- | -------------------------------------------- |
| Supabase project  | `merqo` (shared, prod)      | `merqo-staging` (same schema-per-kit layout) |
| merqo             | `www.merqo.io` from `main`  | `staging.merqo.io` from `staging`            |
| qkit              | `qkit.merqo.io` from `main` | `qkit-staging.merqo.io` from `staging`       |
| Per-PR previews   | n/a                         | `*.vercel.app`, `Preview` env (staging DB)   |
| Cross-kit secrets | prod values                 | separate staging-only values                 |

- `staging` always equals `main`. The `staging sync` workflow
  (`.github/workflows/staging-sync.yml`) fast-forwards it on every push to `main`.
  Never commit to `staging` directly: the next sync then fails instead of
  overwriting it.
- Staging hosts are custom subdomains, not the free `-git-staging-` aliases.
  Both Vercel projects use Deployment Protection on every `*.vercel.app` URL
  (`all_except_custom_domains`), so an alias would answer qkit's server-to-server
  calls with a Vercel login page. Custom domains are exempt. Keep that protection
  setting as it is.
- Every per-PR preview inherits the `Preview` env vars, so it uses the staging
  database and calls the sibling's staging host.
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` stays Production-only. Staging and previews log
  in per host.

## One-time setup (owner)

Keep every password, key and secret below in your password manager, never in a
file in any repo.

### 1. Create the Supabase project

1. Supabase dashboard, same organization as production: **New project**, name
   `merqo-staging`, region **Southeast Asia (Singapore)** to match production.
   Generate a database password and save it.
2. Note the project ref (the `<ref>` in `https://<ref>.supabase.co`), the
   publishable key and the secret key (Settings, API Keys).
3. Settings, Data API, **Exposed schemas**: add `merqo` and `qkit`, save.
4. Authentication, Sign In / Providers: turn on **Confirm email** (same as
   production).
5. Authentication, URL Configuration:
   - Site URL: `https://staging.merqo.io`
   - Redirect URLs: `https://staging.merqo.io/**`, `https://qkit-staging.merqo.io/**`,
     `https://*-merqo-io.vercel.app/**`
6. Optional, for Google sign-in on staging: in Google Cloud Console create a new
   OAuth client for staging with the authorized redirect URI
   `https://<ref>.supabase.co/auth/v1/callback`, then paste its client ID and
   secret into Authentication, Providers, Google. Email and password sign-in works
   without this.

### 2. Load the schema

`supabase db push` cannot do this: every kit's migrations share one
`supabase_migrations` history table and reuse the same version numbers (`0001`
and up), so a second repo's push would skip files it thinks are applied.
`scripts/staging-migrate.sh` applies each file with psql instead, one transaction
per file, and refuses to run if the schema already exists.

1. Start Docker Desktop.
2. Supabase dashboard, staging project, **Connect**: copy the **Session pooler**
   URI (the direct connection is IPv6 only) and put the database password in it.
3. In PowerShell, from the merqo checkout on `main`:

   ```powershell
   $s = Read-Host "Staging session pooler URI" -AsSecureString
   $env:STAGING_DB_URL = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
   docker run --rm -e STAGING_DB_URL -v "${PWD}:/repo:ro" postgres:17.6-alpine sh /repo/scripts/staging-migrate.sh
   ```

   It ends with `done: <n> file(s)`.

4. In the same PowerShell window, `cd` to the qkit checkout on `main` and run the
   same `docker run` line. merqo goes first because qkit's migrations call
   `merqo.*` functions.
5. `Remove-Item Env:STAGING_DB_URL`

### 3. Staging domains

1. Vercel, project **merqo**, Settings, Domains: add `staging.merqo.io`, choose
   **Connect to an environment: Preview** and set the Git branch to `staging`.
2. Vercel, project **qkit**: add `qkit-staging.merqo.io` the same way.
3. Porkbun DNS for `merqo.io`: add a CNAME for `staging` and one for
   `qkit-staging`, each pointing at the target Vercel shows for that domain.
4. The `staging` branch is created by the first `staging sync` run. If it does
   not exist yet: GitHub, merqo-io/Merqo, Actions, **staging sync**, Run workflow.
   Same for merqo-io/Qkit.

### 4. Staging-only secrets

Generate three new values in PowerShell (run once per secret):

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

- `STAGING_MERQO_CUSTOMER_SECRET`
- `STAGING_MERQO_METRICS_SECRET`
- `STAGING_MERQO_PROVISION_SECRET`

None may equal its production counterpart.

### 5. Vercel `Preview` env vars

Some names are team **shared** variables (Team Settings, Environment Variables)
scoped Production and Preview. A project-level variable with the same name and
environment overrides a shared one, so add these at **project** level, scope
**Preview** only. For a name that already exists at project level as
"Production, Preview", first edit it and untick Preview, then add the Preview
value.

**merqo** project:

| Name                                   | Preview value                   |
| -------------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<ref>.supabase.co`     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | staging publishable key         |
| `SUPABASE_SECRET_KEY`                  | staging secret key              |
| `MERQO_CUSTOMER_SECRET`                | `STAGING_MERQO_CUSTOMER_SECRET` |
| `NEXT_PUBLIC_QKIT_URL`                 | `https://qkit-staging.merqo.io` |

**qkit** project:

| Name                                   | Preview value                    |
| -------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<ref>.supabase.co`      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | staging publishable key          |
| `SUPABASE_SECRET_KEY`                  | staging secret key               |
| `MERQO_BASE_URL`                       | `https://staging.merqo.io`       |
| `MERQO_CUSTOMER_SECRET`                | `STAGING_MERQO_CUSTOMER_SECRET`  |
| `MERQO_METRICS_SECRET`                 | `STAGING_MERQO_METRICS_SECRET`   |
| `MERQO_PROVISION_SECRET`               | `STAGING_MERQO_PROVISION_SECRET` |

Also on **qkit**: edit `PAYKIT_KIT_SECRET`, `PRINTKIT_KIT_SECRET` and
`PRINTKIT_CALLBACK_SECRET` and untick Preview, leaving them Production only.
paykit and printkit have no staging yet, and Preview must not hold production
secrets. Payment and printing then stay off on staging (they fail closed).

`NEXT_PUBLIC_*` values are baked in at build time: after saving, redeploy the
`staging` deployment of both projects (Deployments, the latest `staging` one,
Redeploy). Previews built before the change keep the old values.

### 6. Seed staging

1. Open `https://qkit-staging.merqo.io/login`, sign up with an email you control
   (for example `you+staging@...`). Confirm it from the email. Supabase's built-in
   mailer only delivers to members of the Supabase organization.
2. Staging project, Authentication, Users: copy that user's UID.
3. Staging SQL Editor: run qkit's `supabase/seed/coffee-cart-prod.sql` with
   `__VENDOR_ID__` replaced by the UID.
4. Staging SQL Editor: run merqo's `supabase/seed/staging-registry.sql` with its
   placeholders replaced (`__QKIT_STAGING_URL__` is `https://qkit-staging.merqo.io`;
   the two secrets are the staging values from step 4; `__ADMIN_USER_ID__` is the
   UID). It refuses to run on a database whose registry points at production
   hosts.

### 7. Smoke checks

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" https://staging.merqo.io/api/merqo/legal-status
curl.exe -s -o NUL -w "%{http_code}`n" https://qkit-staging.merqo.io/api/merqo/metrics
```

Both should print `401` (deployed, secret required). A `404` or a Vercel login
page means the domain is not on the `staging` branch yet.

Sign in at `https://staging.merqo.io/login` with the staging user and open
`/admin/products`: qkit should show **Reporting**. `401` there means the metrics
secret in Vercel and in `merqo.products` differ.

### 8. End-to-end check (the pilot's pass/fail)

1. Sign in at `https://qkit-staging.merqo.io/login` with the staging user.
2. Open `/legal/accept`, tick the box, submit. Expect `/dashboard`, no error.
3. Staging SQL Editor:
   `select vendor_email, doc_type, kit_slug from merqo.legal_acceptances;`
   Expect a `terms` and a `privacy` row for the staging email, `kit_slug = 'qkit'`.
4. **Production** SQL Editor (check which project the tab is on):
   `select count(*) from merqo.legal_acceptances where vendor_email = '<staging email>';`
   Expect `0`.

If all four pass, roll the same steps out to the other four kits. If one fails,
fix it first.

## Migration-bearing PRs: staging first

Before merging a PR that adds a file under `supabase/migrations/`:

1. Apply only the new file(s) to staging, from the PR branch checkout:

   ```powershell
   docker run --rm -e STAGING_DB_URL -v "${PWD}:/repo:ro" postgres:17.6-alpine sh /repo/scripts/staging-migrate.sh supabase/migrations/<new-file>.sql
   ```

   (`STAGING_DB_URL` set as in setup step 2.)

2. Check the PR's own Vercel preview end to end. It already uses the staging
   database and the sibling's staging host.
3. Merge the PR.
4. Apply the same file to production the usual way (Supabase SQL Editor).

A PR without a migration needs no extra step: its preview already runs against
staging.

## Known limits

- No automatic drift check between staging and production schemas. The gate
  above is the only guard.
- Before step 5 is done, previews still use the production database.
