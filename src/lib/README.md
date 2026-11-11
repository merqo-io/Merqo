# lib

Shared domain logic, validated HTTP boundaries, database adapters and display
helpers. Session clients enforce vendor RLS; service clients are server-only and
require the caller to establish the relevant authorization first.

## Authorization and persistence

`team.ts` and `admin.ts` establish team access and support the operator console.
`vendor.ts` establishes signed-in vendor context and current legal acceptance.
`merqo-vendor-profile.ts` reads/provisions the shared profile and applies
owner-scoped field patches. `schemas.ts` validates profile input, including
HTTP(S)-only social links. `feedback-support-schemas.ts` validates dialog input.
`types.ts` mirrors the migration contracts; server actions return the shared `ActionResult` from `@merqo/ui/kit-api`.

`team.ts` also requires a verified second factor (`aal2`) for every operator page and
action; `requireTeamMember()` is the membership-only check the `/mfa` page uses.
`nonce-prefixes.ts` lists the routes that get a nonce CSP; `proxy.ts` hands them to the shared `createProxy`, which builds the CSP source lists. The root layout takes `themeProps` from `@merqo/ui/next`.

`products.ts`, `support.ts` and `vendor-feedback.ts` read console data. Registry secrets remain server-side. `admin.ts` owns the
best-effort audit writer and recent-entry read; an audit failure is not proof
that the primary mutation failed.
`products.ts` exposes `listLiveProducts()` (status `live`, grantable kits) and `listEntitlementTargets()` (`live` plus `push_only`, i.e. printkit, for entitlement pushes only).

## Pricing

`pricing/` holds the plan catalog loader and the integer-cent price math
(annual price, co-term proration, All-Access upgrade credit, Event Pass
charges). See `pricing/README.md`.

## Cross-kit calls

`kit-action-request.ts` centralizes timeout, parse and Zod validation for peer
HTTP calls. Metrics and vendor metrics have separate response schemas and
clients; `vendor-activity-client.ts` validates with `vendorActivityPayloadSchema`
from `@merqo/ui/contracts` (optional `incidents`/`recent`). `tenant-health.ts`
`getTenantHealth()` pools those activity reads (6 at a time, 3000 ms timeout)
into per-vendor incident rows for `/admin/products`, never throwing on a dead kit. `subscription-requests.ts` files and closes vendor upgrade/cancel requests for the admin queue;
`event-pass-usage-client.ts` reads the cups a vendor sold on qkit inside an Event Pass window (`getEventPassUsage`, never throws, `ok: false` when unavailable) for the admin settle view;
`entitlements/` derives what each vendor may use per kit and pushes it to the kits (see its README);
`vendor-sync.ts` refreshes grants against the live registry with an email-scoped
throttle. `vendor-grants.ts` provides client-safe grant-state helpers.

`customer-notify-auth.ts` verifies the shared bearer secret for inbound Telegram
and legal endpoints. It authenticates a participating server, not an end user.
`telegram.ts` generates link tokens and sends notifications best-effort without
logging credentials. Customer consent and token consumption are database/RPC
contracts; mocked network tests do not establish those database guarantees.

## Pure logic and presentation

`health.ts`, `overview.ts`, `funnel.ts`, `nps.ts` and `savings.ts` derive
console and dashboard figures (`countHealth` counts each kit once, so a lagging kit is not also "reporting"). Funnel counts are distinct populations, so do not
report them as nested conversion stages. `kits.ts` is the family configuration (each kit's readiness, `piloting` or `in-build`, and URL
defaults to `https://<kit>.merqo.io`, overridable with `NEXT_PUBLIC_<KIT>_URL`);
`ecosystem.ts` derives its diagram status from that configuration.
`format.ts` provides display formatting (`timeAgo` returns `-` for an unparseable timestamp). The form label and error class strings come from `@merqo/ui` (`FORM_LABEL_CLASS`, `FORM_ERROR_CLASS`).
`sg-date.ts` provides `sgDay`, the Asia/Singapore YYYY-MM-DD formatter the vendor admin page uses for every date it shows. Its test pins the 16:00Z to 24:00Z window, where the Singapore date is a day ahead of UTC.
`brand-mark.ts` binds merqo's colours to the shared `brandIcon` for the icon routes; `account.ts` safely reads metadata.

`tour-prefs.ts` persists onboarding timestamps best-effort. Both server-render
and client-action call sites exist; failed writes/navigation can still prevent
persistence, and tour status is never authorization.

## Shared UI and Storage

Redirect validation and image resizing come from `@merqo/ui`; local
`safe-redirect.ts` and `image-resize.ts` copies have been removed.
`image-upload-adapter.ts` stays local because it owns bucket/object paths.
Cleanup accepts only supported public avatar buckets and never external OAuth
pictures; owner-folder Storage policies constrain deletion. An uncertain save
outcome is not proof that an uploaded object is unused.

See [supabase](supabase/README.md) for browser/session/service clients.
Co-located tests cover boundary errors and pure behavior; live RLS and cross-kit
integration are verified separately.

`waitlist.ts` writes `marketing_consents` only when the updates box is ticked (re-ticking refreshes it and clears `withdrawn_at`); the wording lives in `waitlist-consent.ts`.

## Parent

[src](../README.md)

The shared CSP builder also allows the Vercel toolbar origin (`vercel.live`) outside production, and images allow `https://*.googleusercontent.com` for Google sign-in avatars.

ate-limit.ts holds clientIp (x-vercel-forwarded-for, x-real-ip, then the last x-forwarded-for hop) and
ateLimit, a Postgres fixed-window counter that fails open or closed per caller. An unresolvable IP is metered in one shared bucket at 10x the limit. earer-guard.ts fronts the kit-to-Merqo routes and elegram-limits.ts holds Telegram's 4096-character message cap.

`rate-limit.ts` is a thin wrapper that feeds the shared `@merqo/ui/kit-api` limiter a Postgres-backed store: the fixed-window limiter (`rate_limit_hit`, migration `0041`). `clientIp` resolves the caller from `x-vercel-forwarded-for`, then `x-real-ip`, then the last non-empty `x-forwarded-for` hop (never the spoofable first), only a value that parses as an IP address (`net.isIP`) is accepted; anything else, or nothing, becomes `unknown` and shares one bucket at 10x the route's limit. `bearer-guard.ts` fronts the `/api/merqo` routes with a 300/min per-IP cap (`legal-status` is exempt) and logs rejected bearers without the secret. `telegram-limits.ts` holds Telegram's 4096-character message cap. Counter failures fail open.

`kit-route-limits.ts` holds `KIT_ROUTE_MAX`, the length caps the kit bearer routes apply to free-form strings (`kit_slug` 64, `notify_ref` 128, `phone` 32, `doc_version` 64, `user_agent` 512), since the backing columns are unbounded text.

`auth-error-copy.ts` holds `authErrorCopy(raw, fallback)`, which maps known Supabase auth error messages to plain copy and otherwise logs only a tag and error code and returns the fallback.
`pricing/format.ts` maps the stored `qkit` tier to the label Pro; the stored value is unchanged, only its label. The dashboard kit card uses the shared `tierLabel` from `@merqo/ui`.
