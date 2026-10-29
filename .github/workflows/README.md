# workflows

## Purpose

GitHub Actions CI pipelines: `ci.yml` (harness integrity, check, unit
tests, coverage gate, build, both e2e suites, changelog gate,
README-freshness gate, comment-hygiene gate, db migrations + RLS) and
`security.yml` (gitleaks secret scan, dependency audit — no CodeQL, since
code-scanning upload requires GitHub Advanced Security, unavailable on
this private repo's free tier).

## Contents

- `ci.yml` — triggers on push to `main` and on every PR. Jobs: `test`
  ("check + unit" — harness-integrity check, `pnpm check`, `pnpm exec vitest --run --coverage`,
  changed-line coverage via `diff-cover` ≥80%); `build` ("build (next
  build)"); `e2e` ("e2e (public smoke)" — Playwright against the public
  landing/login flow); `e2e-admin` ("e2e (admin interaction)" — Playwright
  admin-console interaction flows against a real local Supabase instance);
  `changelog` (PR-only, `skip-changelog` bypass); `readme-freshness`
  (PR-only, `skip-readme-check` bypass); `comment-hygiene` (PR-only,
  hard-gates change-narration comments in added lines,
  `skip-comment-check` bypass); `db` ("db (migrations + pgTAP RLS)").
- `security.yml` — gitleaks secret scan + `pnpm audit`, triggered on push
  to `main`, every PR, and a weekly cron.
  The gitleaks job installs the pinned release binary and checks its SHA-256, because gitleaks-action needs a paid license on organization-owned repos. It scans the PR commits, or the pushed range on `main`.
- `staging-sync.yml`: on push to `main` (or a manual run), fast-forwards the
  `staging` branch to `main` so the staging deployment always runs main's code.
  Fast-forward only: if `staging` has diverged the job fails instead of
  overwriting it. It then POSTs the project's Vercel deploy hook (repo secret
  `VERCEL_STAGING_DEPLOY_HOOK`), because Vercel does not git-deploy a commit it
  already built for production; without the secret it only warns. Only this job
  gets `contents: write`.
- `schema-fingerprint.yml`: on demand, weekly and on PRs that touch the
  fingerprint SQL, loads all six repos' migrations into a fresh local Supabase
  stack in staging order and uploads `expected-fingerprint.csv` as an
  artifact for `docs/SCHEMA-DRIFT.md`. It never connects to a real project.

Every third-party action in both workflows is pinned to a full commit SHA,
not a floating version tag.

## Parent

[.github](../README.md)

The unit suite runs once with coverage. Vitest enforces at least 80% statements, branches, functions and lines over production source; any existing changed-line coverage gate remains in place.

The three PR-only gates in `ci.yml` (changelog, README freshness, comment hygiene) fail when `origin/<base>` is missing, and read the base branch from `env`.
