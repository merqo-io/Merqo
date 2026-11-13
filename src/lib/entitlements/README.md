# entitlements

## Purpose

Merqo is the source of truth for what each vendor may use in each kit. This
folder derives that from `merqo.subscriptions` and `merqo.event_passes`, stores
the admin-side changes, and pushes the result to every live and `push_only` kit. Nothing here
charges anyone; prices and payment stay manual until billing exists.

## Contents

- `contract.ts`: `entitlementPayloadSchema` (zod), the `EntitlementPayload`
  type and `entitlementResponseSchema`. The wire contract below; kits copy it. The tier enum lives inside the schema; there is no separate `EntitlementTier` type, and `store.ts` keeps `SyncErrorKind` module-private.
- `contract.test.ts`: tier rules per kit, date formats, response shape.
- `derive.ts`: `deriveEntitlements()`, pure. Takes a vendor's subscriptions and
  event passes, the plan catalog, the live kit slugs and `now`; returns one
  entitlement per push target (`listEntitlementTargets()`: live and `push_only`). Kit tier is the highest across all active sources.
- `derive.test.ts`: free default, each plan, starter vs qkit (starter paykit), off-sale plans, All Access,
  founder active vs expired, event pass running/upcoming/expired, overlapping
  sources, canceled and lapsed subscriptions, kits that are not live.
- `periods.ts`: `addMonths`, `periodEnd`, `founderUntil` (UTC calendar months,
  month-end clamped). `periods.test.ts` covers them.
- `store.ts`: service-client reads and writes for subscriptions, event passes,
  push state and the founder count (`FOUNDER_CAP` 20). The founder cap is
  enforced by a database trigger; `grantSubscription` turns its `23514` into
  `FounderCapError`. `findVendorId` maps an email to the auth id through the
  service-only `user_id_for_email` function. `settleEventPass` records the
  offline settle (cups, top-up cents, who and when) and only matches a still
  active pass. `store.test.ts` covers it.
- `push.ts`: `pushKitEntitlement()` posts one payload with the kit's
  `provision_secret`; `syncVendorEntitlements()` derives, pushes to every live
  and `push_only` kit (printkit; or `opts.kits`), records each result in `merqo.entitlement_sync` and
  mirrors the derived tier into `vendor_links.plan`. `mirrorDerivedPlans()`
  rewrites that mirror without pushing, run by the dashboard sync so legacy
  kit-reported values and lapsed subscriptions are corrected. Neither throws: a 404
  (kit has no route yet), a timeout or a network error is recorded as `failed`,
  a kit with no `app_url` or secret as `skipped`. A failure also stores its
  kind (`last_error_kind`: network, http, parse, schema) so the admin page can
  tell a missing route from an unparseable reply. `push.test.ts` covers it.

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
  `free | paid`. A starter subscription grants qkit `starter` plus `paid` for
  the other kits in its sold `included_kits` (paykit on new sales, not
  printkit). Plans switched off in the catalog still entitle existing
  subscriptions. printkit is `paid` when the qkit tier is `qkit` (qkit plan,
  All Access or an active founder).
- `founder`: true only while a founder subscription is active and inside its
  12-month founder window and paid period. The benefits (All Access) arrive as
  `tier`, so a kit never computes them.
- `stats_window`: `24h` for free and starter; `90d` when the vendor has the full
  qkit tier (qkit plan, All Access, founder). Same value on every kit.
- `event_pass`: the running pass, else the soonest upcoming one, only on qkit,
  printkit and paykit; `null` otherwise. While `now` is inside the window the
  vendor gets qkit core, printkit labels and paykit for it, even though `tier`
  stays as derived. It is not folded into `tier`; the kit applies the window
  itself (and its stats depth is the pass window). Passes start at Singapore
  midnight (UTC+8).
- `valid_until`: when the tier lapses unless pushed again; `null` for free.
  Kits MUST enforce `valid_until` and the `event_pass` window themselves
  (treat the tier as `free` once `valid_until` has passed): merqo has no
  scheduled job, so a lapse takes effect without a fresh push.
- `issued_at`: ISO timestamp; a kit ignores a payload older than the last one
  it applied.
- A kit answers `200` with `{ "ok": true }`. Any other answer is recorded as
  failed and the admin can press Re-push.

Subscriptions count while `status` is `active` and `current_period_end` is in
the future. There is no renewal job: admin-collected (`admin_manual`)
subscriptions end at `current_period_end` and a renewal is a re-grant.

## Parent

[lib](../README.md)
