# Data model

Rehomed from AGENTS.md; the summary there points here.

One shared Supabase project, schema per kit. Merqo owns `merqo.*`:
`merqo_team` (team membership, managed on `/admin/team`), `products` (kit registry +
per-product `metrics_secret`, surfaced on `/dashboard`; status `live`, `coming_soon` or
`push_only` — printkit (`0042`) only receives entitlement pushes and is excluded from
`listLiveProducts()` and the admin grant list), `vendor_links`
(vendor↔kit, email-keyed, waitlist/active — granted/revoked on `/admin/vendors`),
`vendor_sync_state` (`0023`, per-email kit-sync throttle marker, service-role only).
RLS default-deny; team-membership via `merqo.is_merqo_team()`. `products` +
`vendor_links` are read/written via the **service-role client** (server-only) so
the `metrics_secret` never reaches a browser.

**Event pass settle (0043):** `event_passes` gained nullable `settled_cups`,
`settled_cents`, `settled_at` and `settled_by` (FK to `auth.users`, indexed) and a
`settled` status. A CHECK keeps the four settle fields all set when status is
`settled` and all null otherwise. Merqo charges nobody: after a pass ends the team
collects the top-up offline, then "Mark settled" re-reads the pass window's cups
from qkit (`GET /api/merqo/event-pass-usage`, bearer `metrics_secret`) and stores
cups and the top-up (`eventPassChargeCents` minus `prepaid_cents`, floored at 0).
RLS and grants are unchanged.

**Free trial (0046):** `trials` holds one row per vendor (`vendor_id` unique, nullable, `on delete set null`
so an erased account still counts as having used a trial). A trial is 30 days of Pro from the vendor's first
qkit order (`first_order_at`), not from sign-up. `status` is `active`, `blocked`, `overridden` or `ended`;
an expired trial is read as Free by `deriveEntitlements`, no sweep flips it. `email_normalized` (lowercase,
`+tag` dropped, Gmail dots dropped; done in `src/lib/entitlements/trial.ts`) and `paynow_uen` are indexed
but deliberately not unique: `start_trial()` inserts `blocked` when another non-blocked row shares either
value, and keeps the row as the record. `set_trial_uen()` re-runs that match and blocks a running trial;
`override_trial()` starts a fresh 30 days with a required reason. `trial_candidates()` feeds the daily
cron (least recently checked first, using `trial_checks`). RLS is on, the team reads, and every write goes
through service-role-only functions. Trials are not subscriptions: nothing is charged.

**Founder numbers and billing open date (0045):** `founder_numbers` (`number` PK 1 to 20, nullable unique
`vendor_id` to `auth.users` with `on delete set null`, `assigned_at`) holds the founding merchant badge
(#01 to #20). A trigger on `subscriptions` gives a vendor the lowest free number the first
time they get a founder row; numbers are kept after `founder_until` passes and after an account is erased (the row stays with a null `vendor_id`, so the number is retired and never reused) and existing
founders were backfilled by earliest founder `created_at`. `billing_config` is a one-row
table (`id` boolean PK) whose `billing_opens_at` is set on `/admin/billing`; once now is
past it plus 60 days, `enforce_founder_cap()` refuses a new founder vendor (existing
founders can still be updated). `founder_spots_left()` (security definer, executable by
anon and authenticated) returns 0 when closed by date, else 20 minus distinct founders,
and nothing else. Both tables are team-read only through RLS; writes go through the
service role or the trigger.

**Customer Telegram identity (0019, 2026-08-16):** `customers` (0018) was widened
— surrogate `id` PK, `phone` now nullable, plus `telegram_chat_id`/
`consent_given_at`/`pending_notify_ref` and a `customers_identity_check`
constraint (phone or telegram_chat_id, not neither) — so a customer can connect
via Telegram alone, with no phone number. RLS enabled, zero policies, no
table-level grant to anyone: every access path is a SECURITY DEFINER RPC —
`upsert_customer` (0018, phone-keyed), plus three new ones (`upsert_customer_telegram`,
`claim_customer_by_notify_ref`, `find_customer_telegram_by_phone`), all
`service_role`-only with `EXECUTE` explicitly revoked from `PUBLIC` (none of
the three has an in-body caller check the way `upsert_vendor_profile` does —
the HTTP-layer bearer check below is the only gate). `telegram_link_tokens`
(0019, widened by 0020's `kind` column) is RLS-enabled, zero client policies,
`service_role`-only, same shape as every other `*_link_tokens` table in this
ecosystem.

**Vendor Telegram connect, Phase A2 (0020, 2026-08-16):** consolidates qkit's
and loopkit's own separate per-kit vendor-alert bots onto this same shared
bot — see the master doc's "Phase A2" section for why this supersedes Phase
A. `telegram_link_tokens` gets a `kind` column (`'customer'` default-backfilled
for every pre-0019 row, or `'vendor'`; `notify_ref`/`kit_slug` now nullable —
a standing vendor link has no single order to scope to) so the webhook's
`/start` handler can resolve either kind. New `vendor_telegram` table
(`vendor_id` PK — the shared `auth.users.id` every kit already keys on, no
widened-identity substrate needed here unlike `customers` above): RLS
enabled, own-row `select` policy (`vendor_id = (select auth.uid())`) plus a
table-level `select` grant to `authenticated`, no client write grant — every
write goes through the service-role client (the webhook route on link, the
profile page's `disconnectVendorTelegram` action). No migration path for an
already-linked vendor — private Telegram chat IDs identify the user, but
that user must initiate contact with each bot before it can message them.
Vendors linked to qkit's/loopkit's retired bots reconnect to merqo's bot
via `/profile`, establishing its permission to send alerts.

**kit → merqo HTTP (new direction, 2026-08-16):** every other cross-kit call in
this codebase flows merqo → kit (metrics pull, vendor-provision). The customer
Telegram-connect flow was the first exception, and Phase A2's vendor pair
followed the same shape — qkit and loopkit call INTO merqo, gated by
`customerNotifySecretOk` (`src/lib/customer-notify-auth.ts`), a
constant-time check of `Authorization: Bearer <MERQO_CUSTOMER_SECRET>` — one
shared-secret value known by merqo and every participating kit, same simple
pattern `MERQO_METRICS_SECRET` already uses in the opposite direction. See
`docs/superpowers/specs/2026-08-16-customer-telegram-connect-design.md` and
`docs/superpowers/specs/2026-08-16-vendor-telegram-connect-design.md`.

## Parent

[docs](README.md)
