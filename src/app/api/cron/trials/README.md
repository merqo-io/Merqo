# trials

## Purpose

Daily Vercel cron that starts the 30-day Pro trial for qkit vendors who have
placed their first order. Scheduled at 02:00 UTC in `vercel.json`.

## Contents

- `route.ts`: `GET`. Rejects with 401 unless the `Authorization` header equals
  `Bearer ${CRON_SECRET}` (constant-time compare; an unset secret rejects
  everything). Otherwise runs `runTrialSweep()` and returns its counts.
  The sweep looks up at most 25 vendors per run, one at a time, to stay under
  qkit's per-IP rate limit.
- `route.test.ts`: auth and error handling.

## Parent

[cron](../README.md)
