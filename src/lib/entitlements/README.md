# entitlements

## Purpose

Merqo is the source of truth for what each vendor may use in each kit. This
folder derives that from `merqo.subscriptions` and `merqo.event_passes`, stores
the admin-side changes, and pushes the result to every live kit. Nothing here
charges anyone; prices and payment stay manual until billing exists.

## Contents

- `contract.ts`: `entitlementPayloadSchema` (zod), the `EntitlementPayload`
  type and `entitlementResponseSchema`. The wire contract below; kits copy it.
- `contract.test.ts`: tier rules per kit, date formats, response shape.
- `derive.ts`: `deriveEntitlements()`, pure. Takes a vendor's subscriptions and
  event passes, the plan catalog, the live kit slugs and `now`; returns one
  entitlement per live kit. Kit tier is the highest across all active sources.
- `derive.test.ts`: free default, each plan, starter vs qkit, All Access,
  founder active vs expired, event pass running/upcoming/expired, overlapping
  sources, canceled and lapsed subscriptions, kits that are not live.
- `periods.ts`: `addMonths`, `periodEnd`, `founderUntil` (UTC calendar months,
  month-end clamped). `periods.test.ts` covers them.
- `store.ts`: service-client reads and writes for subscriptions, event passes,
  push state and the founder count (`FOUNDER_CAP` 20). The founder cap is
  enforced by a database trigger; `grantSubscription` turns its `23514` into
  `FounderCapError`. `findVendorId` maps an email to the auth id through the
  service-only `user_id_for_email` function. `store.test.ts` covers it.
- `push.ts`: `pushKitEntitlement()` posts one payload with the kit's
  `provision_secret`; `syncVendorEntitlements()` derives, pushes to every live
  kit (or `opts.kits`), records each result in `merqo.entitlement_sync` and
  mirrors the derived tier into `vendor_links.plan`. Neither throws: a 404
  (kit has no route yet), a timeout or a network error is recorded as `failed`,
  a kit with no `app_url` or secret as `skipped`. `push.test.ts` covers it.

## Entitlement contract

`POST {kit.app_url}/api/merqo/entitlement` with
`Authorization: Bearer {products.provision_secret}` (the kit checks its
`MERQO_PROVISION_SECRET`, as it does for `vendor-provision`). One call per kit
per vendor, JSON body:

```json
{
  "email": "vendor@example.com",
  "kit": "qkit",
  "tier": "qkit",
  "founder": true,
  "stats_window": "90d",
  "event_pass": {
    "starts_at": "2026-12-01T00:00:00.000Z",
    "ends_at": "2026-12-03T00:00:00.000Z"
  },
  "valid_until": "2027-06-01T00:00:00.000Z",
  "issued_at": "2026-11-02T08:00:00.000Z"
}
```

- `tier`: `qkit` takes `free | starter | qkit`; every other kit takes
  `free | paid`. printkit is `paid` when the qkit tier is `qkit` (qkit plan,
  All Access or an active founder).
- `founder`: the founder badge, true for good once granted. Founder benefits
  (All Access for 12 months) arrive as `tier`, so a kit never computes them.
- `stats_window`: `24h` for free and starter; `90d` when the vendor has the full
  qkit tier (qkit plan, All Access, founder). Same value on every kit.
- `event_pass`: the running pass, else the soonest upcoming one, only on qkit,
  printkit and paykit; `null` otherwise. It is not folded into `tier`; the kit
  applies the window itself (and its stats depth is the pass window).
- `valid_until`: when the tier lapses unless pushed again; `null` for free.
- `issued_at`: ISO timestamp; a kit ignores a payload older than the last one
  it applied.
- A kit answers `200` with `{ "ok": true }`. Any other answer is recorded as
  failed and the admin can press Re-push.

Subscriptions count while `status` is `active` and `current_period_end` is in
the future. There is no renewal job, so the admin re-saves a subscription to
extend it.

## Parent

[lib](../README.md)
