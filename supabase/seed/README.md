# seed

## Purpose

SQL run by hand against a hosted Supabase project. Nothing here runs in CI or
on `supabase start`.

## Contents

- `staging-registry.sql` points the staging project's `merqo.products` registry
  at the staging qkit host with the staging-only metrics and provision secrets,
  blanks the URLs and secrets of kits that have no staging deployment (so staging
  merqo never calls a production kit), and adds the staging admin to
  `merqo.merqo_team`. It aborts if the registry points at production hosts. Run
  it once per staging setup, as described in `docs/STAGING.md`.

## Parent

[merqo](../../README.md)
