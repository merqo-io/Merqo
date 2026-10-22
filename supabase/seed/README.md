# seed

## Purpose

SQL run by hand against a hosted Supabase project. Nothing here runs in CI or
on `supabase start`.

## Contents

- `staging-registry.sql` points the staging project's `merqo.products` rows for
  qkit, loopkit, paykit and stockkit at their `<kit>-staging.merqo.io` hosts with
  each kit's staging-only metrics and provision secrets, blanks the URLs and
  secrets of every other kit (so staging merqo never calls a production kit),
  and adds the staging admin to `merqo.merqo_team`. It aborts while a
  placeholder is left or when the registry points at production hosts, and is
  safe to re-run as each kit joins staging (`docs/STAGING.md`).

## Parent

[merqo](../../README.md)
