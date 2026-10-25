# supabase

## Purpose

Local Supabase stack configuration and the merqo schema.

## Contents

- `config.toml`: local stack settings. TOTP enrol and verify are on so the e2e admin flow can clear MFA locally.
- `migrations/`: the numbered SQL chain for the `merqo` schema (see its README).
- `tests/`: pgTAP suites run by `supabase test db`.

## Parent

[Merqo](../README.md)
