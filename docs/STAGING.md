# Staging environment

Staging is a second Supabase project plus a long-lived `staging` branch per app,
so Vercel `Preview` deployments never read or write production data. Design:
`docs/superpowers/specs/2026-09-10-staging-environment-design.md` in the workspace
root. This file is the setup runbook, the env model and the day-to-day gate.

**Status:** all six apps are on staging: every schema is loaded, each project's
Preview variables point at it and every repo has a `staging` branch with its
`<kit>-staging.merqo.io` domain. The
[rollout checklist](#rollout-to-loopkit-paykit-stockkit-and-printkit) records
the steps, for rebuilding staging or adding a kit.

## How it fits together

| App      | Production          | Staging (`staging` branch)  |
| -------- | ------------------- | --------------------------- |
| merqo    | `www.merqo.io`      | `staging.merqo.io`          |
| qkit     | `qkit.merqo.io`     | `qkit-staging.merqo.io`     |
| loopkit  | `loopkit.merqo.io`  | `loopkit-staging.merqo.io`  |
| paykit   | `paykit.merqo.io`   | `paykit-staging.merqo.io`   |
| stockkit | `stockkit.merqo.io` | `stockkit-staging.merqo.io` |
| printkit | `printkit.merqo.io` | `printkit-staging.merqo.io` |

- One staging Supabase project, `merqo-staging` (Singapore), with the same
  schema-per-kit layout and one shared `auth.users`, like production.
- `staging` always equals `main`. Each repo's `staging sync` workflow
  (`.github/workflows/staging-sync.yml`) fast-forwards it on every push to `main`,
  then calls the project's Vercel deploy hook. The hook is needed because Vercel
  does not start a git deployment for a commit it has already built, and `main`'s
  production deploy always builds it first. Never commit to `staging` directly:
  the next sync then fails instead of overwriting it.
- Every per-PR preview gets the `Preview` env vars, so it uses the staging
  database and calls the other apps' staging hosts.
- **Deployment Protection is off** (`ssoProtection: null`) on every project that
  has a staging host. The `all_except_custom_domains` setting only exempts
  production custom domains: a domain assigned to the `staging` branch still
  showed the Vercel login, which broke both browsers and server-to-server calls.
  The cost: per-PR preview URLs are public. They only reach staging data.

## Env model

Team **shared** variables (Team Settings, Environment Variables) are split per
environment: the Production copy holds the production value, the Preview copy
holds the staging value.

| Shared variable                                      | Preview value                       | Linked to             |
| ---------------------------------------------------- | ----------------------------------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                           | `https://<ref>.supabase.co`         | all 6                 |
| `MERQO_CUSTOMER_SECRET`                              | staging-only value                  | all 6                 |
| `MERQO_BASE_URL`                                     | `https://staging.merqo.io`          | the 5 kits            |
| `NEXT_PUBLIC_<KIT>_URL` (QKIT, LOOPKIT, PAYKIT, ...) | `https://<kit>-staging.merqo.io`    | the apps that read it |
| `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`                     | none (Production only, `.merqo.io`) | all 6                 |

Per project, at **project** level, scope Preview:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`: the staging
  project's keys (each app also keeps a Production copy).
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.merqo.io`, Preview with **Git branch
  `staging`** only, so one sign-in works across the staging hosts. Per-PR
  previews on `*.vercel.app` must not get it (the browser rejects the cookie and
  sign-in breaks). Session cookie names carry the Supabase project ref, so a
  staging session never collides with a production one.
- Every kit's own secrets, with staging-only values (table below). None may
  equal its production counterpart.

| Project  | Preview-only secrets and URLs                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| merqo    | none beyond the shared ones                                                                                                                        |
| qkit     | `MERQO_METRICS_SECRET`, `MERQO_PROVISION_SECRET`, `PAYKIT_KIT_SECRET`, `PAYKIT_CALLBACK_SECRET`, `PRINTKIT_KIT_SECRET`, `PRINTKIT_CALLBACK_SECRET` |
| loopkit  | `MERQO_METRICS_SECRET`, `MERQO_PROVISION_SECRET`                                                                                                   |
| paykit   | `MERQO_METRICS_SECRET`, `MERQO_PROVISION_SECRET`                                                                                                   |
| stockkit | `MERQO_METRICS_SECRET`, `MERQO_PROVISION_SECRET`                                                                                                   |
| printkit | `PRINTKIT_PUBLIC_URL=https://printkit-staging.merqo.io`, Git branch `staging` only (previews fall back to their own URL)                           |

The `MERQO_*` pair of each kit must match that kit's row in `merqo.products`
(`staging-registry.sql`). qkit's `PAYKIT_*` and `PRINTKIT_*` pairs must match
qkit's rows in `paykit.kit_api_keys` and `printkit.kit_api_keys`
(`staging-kit-keys.sql` in each of those repos). qkit's `*_KIT_SECRET` values
hold the hex secret only; qkit sends `qkit:<hex>` itself.

`NEXT_PUBLIC_*` values are baked in at build time: after changing one, redeploy
`staging` (Run workflow on **staging sync**, or Redeploy in Vercel). Previews
built earlier keep the old values.

Google sign-in on staging reuses the production Google OAuth client, with the
staging callback `https://<ref>.supabase.co/auth/v1/callback` added to its
authorized redirect URIs and the same client ID and secret entered under the
staging project's Authentication, Providers, Google.

## Free plan

- Staging is a separate Supabase project, not a Supabase branch. Branching
  needs a paid plan, and it assumes one repo's migration history, while the
  kits share one history table.
- The free plan allows two active projects; `merqo-staging` uses the second.
- Free projects pause after 7 days without activity. Before testing, open the
  staging project in the Supabase dashboard and restore it if it is paused.
  While paused, every preview and staging page fails to load data.
- Google sign-in and email confirmation work on the free plan. The built-in
  mailer only sends to members of the Supabase organization and only a few
  emails per hour, which is enough for a test vendor.

## One-time setup (owner)

Done for merqo and qkit. Keep every password, key and secret in your password
manager, never in a file in any repo.

### 1. Create the Supabase project

1. Supabase dashboard, same organization as production: **New project**, name
   `merqo-staging`, region **Southeast Asia (Singapore)**. Save the database
   password.
2. Note the project ref (`<ref>` in `https://<ref>.supabase.co`), the
   publishable key and the secret key (Settings, API Keys).
3. Settings, Data API, **Exposed schemas**: add every app schema that is on
   staging (`merqo`, `qkit`, then `loopkit`, `paykit`, `stockkit`, `printkit` as
   each rolls out). A missing one gives "Invalid schema" errors in that app.
4. Authentication, Sign In / Providers: turn on **Confirm email**.
5. Authentication, URL Configuration, **before anyone signs in** (without it,
   sign-in redirects fall back to `http://localhost:3000`):
   - Site URL: `https://staging.merqo.io`
   - Redirect URLs: `https://*-staging.merqo.io/**`, `https://staging.merqo.io/**`,
     `https://*-merqo-io.vercel.app/**`
6. Google sign-in: see the last paragraph of [Env model](#env-model).

### 2. Load the schema

`supabase db push` cannot do this: every kit's migrations share one
`supabase_migrations` history table and reuse the same version numbers (`0001`
and up), so a second repo's push would skip files it thinks are applied.
`scripts/staging-migrate.sh` (in every repo) applies each file with psql instead,
one transaction per file, and refuses a bootstrap if the schema already exists.

1. Start Docker Desktop.
2. Supabase dashboard, staging project, **Connect**: copy the **Session pooler**
   URI (the direct connection is IPv6 only) and put the database password in it.
3. In PowerShell:

   ```powershell
   $s = Read-Host "Staging session pooler URI" -AsSecureString
   $env:STAGING_DB_URL = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
   ```

4. From each repo's checkout on `main`, in this order: merqo, qkit, then the
   others (every kit's migrations call `merqo.*` and some read `qkit.*`):

   ```powershell
   docker run --rm -e STAGING_DB_URL -v "${PWD}:/repo:ro" postgres:17.6-alpine sh /repo/scripts/staging-migrate.sh
   ```

   It ends with `done: <n> file(s)`.

5. **If it stops part-way** (the pooler can drop a connection), each file
   already applied stays applied. Resume from file number `N` in the listing
   (the first one that did not print, counting from 1):

   ```powershell
   docker run --rm -e STAGING_DB_URL -v "${PWD}:/repo:ro" postgres:17.6-alpine sh -c 'cd /repo && sh scripts/staging-migrate.sh $(ls supabase/migrations/*.sql | tail -n +N)'
   ```

6. `Remove-Item Env:STAGING_DB_URL`

### 3. Staging domain, branch and deploy hook (per app)

1. Vercel, the app's project, Settings, Domains: add `<kit>-staging.merqo.io`
   (`staging.merqo.io` for merqo), **Connect to an environment: Preview**, Git
   branch `staging`.
2. Porkbun DNS for `merqo.io`: add a CNAME for that subdomain, pointing at the
   target Vercel shows.
3. Settings, Deployment Protection: set **Vercel Authentication** to off.
4. Settings, Git, **Deploy Hooks**: create a hook named `staging` for branch
   `staging`. Copy its URL into the GitHub repo's Actions secrets as
   `VERCEL_STAGING_DEPLOY_HOOK`. Without it the sync still moves the branch but
   prints a warning and staging keeps running the old commit.
5. GitHub, the repo, Actions, **staging sync**, Run workflow. This creates the
   `staging` branch (or moves it) and deploys it. A brand-new workflow can take a
   couple of minutes to appear in the Actions list after its PR merges.

### 4. Env vars

Set the app's Preview variables from [Env model](#env-model), then run
**staging sync** again so the staging deployment picks them up.

### 5. Seed staging

1. Open `https://qkit-staging.merqo.io/login` and sign up with an email you
   control. Confirm it from the email.
2. Staging project, Authentication, Users: copy that user's UID.
3. Staging SQL Editor: run qkit's `supabase/seed/coffee-cart-prod.sql` with
   `__VENDOR_ID__` replaced by the UID.
4. Staging SQL Editor: run merqo's `supabase/seed/staging-registry.sql` with every
   placeholder replaced (each kit's staging metrics and provision secrets, and
   `__ADMIN_USER_ID__`). It refuses to run while a placeholder is left or when
   the registry points at production hosts, and it is safe to re-run. Delete
   the line of a kit that is not on staging yet; its URLs are then blanked so
   staging merqo never calls production.

### 6. Smoke checks

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" https://staging.merqo.io/api/merqo/legal-status
curl.exe -s -o NUL -w "%{http_code}`n" https://qkit-staging.merqo.io/api/merqo/metrics
```

Both print `401` (deployed, secret required). A `404` means the domain is not on
the `staging` branch; a Vercel login page means Deployment Protection is still
on.

Sign in at `https://staging.merqo.io/login` with the staging user and open
`/admin/products`: each kit on staging should show **Reporting**. `401` there
means that kit's metrics secret in Vercel and in `merqo.products` differ.

### 7. End-to-end check

1. Sign in at `https://qkit-staging.merqo.io/login` with the staging user.
2. Open `/legal/accept`, tick the box, submit. Expect `/dashboard`, no error.
3. Staging SQL Editor:
   `select vendor_email, doc_type, kit_slug from merqo.legal_acceptances;`
   Expect a `terms` and a `privacy` row for the staging email, `kit_slug = 'qkit'`.
4. **Production** SQL Editor (check which project the tab is on):
   `select count(*) from merqo.legal_acceptances where vendor_email = '<staging email>';`
   Expect `0`.

## Rollout to loopkit, paykit, stockkit and printkit

Merge each kit's staging PR first (it adds `scripts/staging-migrate.sh` and the
sync workflow). Then, per kit:

1. Supabase: add the kit's schema to **Exposed schemas**. The `https://*-staging.merqo.io/**`
   redirect URL already covers its host.
2. Load its schema (setup step 2, from that kit's checkout on `main`). For
   stockkit, first run
   `drop policy "vendor_avatars_public_read" on storage.objects;` in the
   staging SQL Editor: merqo's `0015` and stockkit's `0006` both create that
   identical policy, and `0006` has no guard (on production it ran first).
   `0006` then recreates it. Skipping `0006` instead (resume from file 8,
   setup step 2.5) also loads, but leaves out stockkit's own three avatar
   write policies; merqo `0015`'s owner policies allow the same writes, so
   behavior matches, while the policy list differs from production.
3. Domain, CNAME, Deployment Protection off, deploy hook and GitHub secret
   (setup step 3).
4. Env vars: the kit's row in the per-project table, plus
   `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` for branch `staging`. Link the shared
   Preview copies of `NEXT_PUBLIC_SUPABASE_URL`, `MERQO_CUSTOMER_SECRET` and
   `MERQO_BASE_URL` if the kit is not linked yet. Set the Preview copy of
   `NEXT_PUBLIC_<KIT>_URL` to the kit's staging host, linked to the apps that
   read it (merqo reads all four; qkit reads `PAYKIT`, `PRINTKIT` and `LOOPKIT`).
5. loopkit, paykit, stockkit: re-run `staging-registry.sql` with that kit's
   secrets filled in.
6. paykit and printkit: generate qkit's staging `*_KIT_SECRET` and
   `*_CALLBACK_SECRET`, set them on qkit's Preview, and run that kit's
   `supabase/seed/staging-kit-keys.sql` in the staging SQL Editor. Then redeploy
   qkit's `staging`.
7. Run **staging sync** on every app whose variables changed, then the smoke
   checks: `curl.exe` the kit's `/api/merqo/metrics` (printkit: `/login`) and
   check `/admin/products`.

## Migration-bearing PRs: staging first

Before merging a PR that adds a file under `supabase/migrations/`:

1. Apply only the new file(s) to staging, from the PR branch checkout
   (`STAGING_DB_URL` set as in setup step 2):

   ```powershell
   docker run --rm -e STAGING_DB_URL -v "${PWD}:/repo:ro" postgres:17.6-alpine sh /repo/scripts/staging-migrate.sh supabase/migrations/<new-file>.sql
   ```

2. Check the PR's own Vercel preview end to end. It already uses the staging
   database and the other apps' staging hosts.
3. Merge the PR.
4. Apply the same file to production the usual way (Supabase SQL Editor).

A PR without a migration needs no extra step: its preview already runs against
staging.

## Known limits

- No automatic drift check between staging and production schemas. The gate
  above is the only guard.
- A kit whose schema is not loaded on staging yet has broken previews: its
  Preview variables already point at the staging project.
