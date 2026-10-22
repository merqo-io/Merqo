# scripts

## Purpose

Founder-run maintenance scripts, invoked manually.

## Contents

- `check-legal-version-skew.mjs` compares the terms, privacy and pilot legal
  versions at each app's exact locked `@merqo/ui` Git commit. Different UI
  releases are allowed when their legal versions match. It uses the sibling
  `merqo-ui` checkout; fetch missing locked commits before running
  `pnpm check:legal-versions`. A missing commit or mismatched legal version
  exits with an error.

- `staging-migrate.sh` applies `supabase/migrations` to the staging Supabase
  project with psql, one transaction per file. Run it inside
  `postgres:17.6-alpine` with the repo mounted at `/repo` (see
  `docs/STAGING.md`). With no arguments it bootstraps every file and refuses
  if the `merqo` schema already exists; with file arguments it applies only
  those, for the staging-first migration gate.

## Parent

[merqo](../README.md)
