# Schema drift check

Finds database objects that differ from what the six repos' migrations
create: a function edited by hand in the SQL editor, a policy or grant
changed on one project only, an object that exists in no repo. It covers
the `merqo`, `qkit`, `loopkit`, `paykit`, `stockkit` and `printkit`
schemas, plus policies on `storage.objects`.

Agents never connect to staging or production, so the database side is a
manual owner step. Automating it needs a read-only database secret in CI,
which is an open owner decision.

## Pieces

- `scripts/schema-fingerprint.sql`: one row per object, `(schema, kind, name, md5)`.
  Kinds: `table` (kind and RLS flags), `column` (type,
  nullability, default), `constraint`, `index`, `trigger`, `policy`,
  `function` (`pg_get_functiondef`), `grant` (table privileges per role) and
  `routine_grant` (function privileges per role). Read-only.
- `.github/workflows/schema-fingerprint.yml`: on demand and every Monday,
  loads all six repos' `main` migrations into a fresh local Supabase stack in
  the staging order (merqo, qkit, loopkit, paykit, stockkit, printkit, with
  the stockkit avatar-policy pre-step from `docs/STAGING.md`), runs the
  fingerprint and uploads `expected-fingerprint.csv` as the
  `expected-fingerprint` artifact.
- `scripts/drift-compare.mjs <expected.csv> <actual.csv> [--known <file>]`:
  prints objects missing from the database, extra in it, or changed, and
  exits 1 on any of them. `--known` takes a list of accepted drift, one
  `schema,kind,name` per line, where a trailing `*` matches a prefix.
- `scripts/schema-drift-known.txt`: the accepted drift list.

## Owner runbook

1. GitHub, merqo repo, Actions, "schema fingerprint", Run workflow on
   `main`. When it finishes, download the `expected-fingerprint` artifact
   and unzip `expected-fingerprint.csv`.
2. In the Supabase SQL editor of the **staging** project, paste
   `scripts/schema-fingerprint.sql`, run it, and download the result as CSV
   (`staging-fingerprint.csv`). Repeat on **production**
   (`prod-fingerprint.csv`). The query only reads catalogs.
3. From the merqo checkout:

   ```bash
   node scripts/drift-compare.mjs expected-fingerprint.csv prod-fingerprint.csv --known scripts/schema-drift-known.txt
   ```

   and the same with `staging-fingerprint.csv`.

4. "No drift." means the database matches the repos. Otherwise each line
   names an object to fix with a new migration in its kit's repo, or to add
   to the known list with a reason.

Run it after each phase's prod migrations, and before a migration that
replaces a function or policy.

## Known drift

- stockkit `product_components`, `stock_movements.linked_movement_id`,
  `prevent_nested_components()` and `record_linked_movement(...)` exist on
  production only (parked 2026-10-23, backlog SK-01). Delete their lines
  from `scripts/schema-drift-known.txt` once SK-01 lands.

The expected side runs migrations as `postgres` on a clean stack. An object
that is the same everywhere but owned or granted differently on a project
shows up as a `grant` or `routine_grant` change; treat it as real drift.
