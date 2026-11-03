# File layout

Rehomed from AGENTS.md. Keep in sync with the source tree.

```
src/app/                    — app router (landing, dashboard, admin console, server actions)
src/app/page.tsx            — public brand landing (static-prerendered)
src/app/dashboard/          — vendor dashboard: (app)/ (overview + kit discovery),
                               open to every signed-in user (requireVendorSession)
src/app/admin/              — Merqo-team console: overview (page.tsx) + vendors/, team/,
                               products/, feedback/ (all auth-gated)
src/app/profile/            — shared account page (signed-in gate only — reachable from
                               both the vendor dashboard and the admin console)
src/app/login/              — email/password sign-in
src/app/api/telegram/webhook/ — merqo's own Telegram bot's webhook (customer + vendor connect,
                               branches on telegram_link_tokens.kind)
src/app/api/merqo/          — bearer-secret endpoints qkit/loopkit call INTO merqo
                               (customer-connect-token, notify-customer, vendor-connect-token,
                               notify-vendor)
src/proxy.ts                — Supabase session refresh + route guard (Next 16)
src/components/landing/      — landing sections (nav, hero, kit-stacker, …)
src/components/dashboard/    — dashboard widgets (stat cards, kit discovery/preview cards)
src/components/ui/           — shadcn primitives (CLI-managed, do not hand-edit)
src/hooks/use-async-action.ts — shared pending/error state for server-action buttons
src/lib/supabase/           — browser / server (schema=merqo) / service clients + mw helper
src/lib/kits.ts             — the kit family config (landing roadmap source of truth)
src/lib/metrics-client.ts   — fetch of a kit's HTTP metrics endpoint
src/lib/telegram.ts         — sendTelegramMessage + generateLinkToken (Bot API, no SDK)
src/lib/qr.ts                — qrSvg: renders a Telegram deep link as inline QR SVG markup
src/lib/customer-notify-auth.ts — customerNotifySecretOk bearer guard (kit → merqo calls,
                               both customer- and vendor-facing routes)
supabase/migrations/        — SQL schema (merqo.* tables) + RLS + grants
```

## Parent

[docs](README.md)
