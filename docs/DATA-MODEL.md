# Data model

Rehomed from AGENTS.md; the summary there points here.

One shared Supabase project, schema per kit. Merqo owns `merqo.*`:
`merqo_team` (team membership, managed on `/admin/team`), `products` (kit registry +
per-product `metrics_secret`, surfaced on `/dashboard`), `vendor_links`
(vendor↔kit, email-keyed, waitlist/active — granted/revoked on `/admin/vendors`),
`vendor_sync_state` (`0023`, per-email kit-sync throttle marker, service-role only).
RLS default-deny; team-membership via `merqo.is_merqo_team()`. `products` +
`vendor_links` are read/written via the **service-role client** (server-only) so
the `metrics_secret` never reaches a browser.

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
