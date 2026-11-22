<!-- templateCentral: nextjs@7.2.2 (Supabase variant — shared project, schema per kit) -->

# AGENTS.md — Merqo

> STOP — This project diverges from the stock templateCentral Next.js stack on the
> data layer only. Auth/DB are **Supabase** (`@supabase/ssr`), not better-auth +
> Drizzle. Authorization is enforced in Postgres via **RLS**. Runtime matches tc:
> Next 16, route protection in `src/proxy.ts`, and
> `cookies()`/`headers()`/`params`/`searchParams` are async.

## What Merqo is

The house brand + dashboard for a modular family of small-business tools ("kits")
for Singapore micro/small sellers. `qkit` (queue/orders), `loopkit` (stamp-card
loyalty), and `paykit` (payments): qkit is piloting; loopkit, paykit and stockkit are in build (see `src/lib/kits.ts`).
This app is the public brand landing + a role-gated operator console:
`/dashboard` (cross-product metrics overview, post-login home), `/admin/vendors`
(grant/revoke kit access per vendor), `/admin/team` (manage Merqo-team members),
`/admin/products` (per-kit health from the metrics API), and `/admin/feedback`
(vendor NPS + comments per kit).
It pulls each kit's metrics over an **HTTP API** (bearer secret) — never a direct
cross-schema query. As of the customer Telegram-connect work (2026-08-16), merqo
is also the **receiving** side of a kit → merqo HTTP call for the first time: it
hosts its own Telegram bot (`/api/telegram/webhook`) plus bearer-secret endpoints
(`/api/merqo/customer-connect-token`, `/api/merqo/notify-customer`) that qkit and
loopkit call so a customer can connect once and get transactional order/reward
notifications across every kit they interact with. As of Phase A2 (also
2026-08-16), that same bot ALSO serves each vendor's own activity alerts —
`/api/merqo/vendor-connect-token`/`/api/merqo/notify-vendor` — superseding
qkit's and loopkit's own separate per-kit vendor-alert bots (now retired on
their side); a vendor connects once from merqo's own `/profile` page. See
"Data model" below,
`docs/superpowers/specs/2026-08-16-customer-telegram-connect-design.md`, and
`docs/superpowers/specs/2026-08-16-vendor-telegram-connect-design.md`.

## Stack

Next.js 16 · App Router · Turbopack · TypeScript strict · Tailwind v4 · shadcn/ui
(new-york) · Zod · Supabase (`@supabase/ssr`) · Vitest · Playwright · pnpm 11 ·
Node ≥24.22.1 · deploy target: Vercel

## Commands

```bash
pnpm dev          # dev server — http://localhost:3000
pnpm build        # production build
pnpm test         # run test suite (vitest)
pnpm test:e2e     # playwright public smoke
pnpm check        # prettier --check + eslint + tsc --noEmit
pnpm format       # prettier --write
```

## File layout and data model

- File layout: see `docs/FILE-LAYOUT.md` (app router, `src/lib/*`, components, migrations).
- One shared Supabase project, schema per kit; Merqo owns `merqo.*` (`merqo_team`, `products`, `vendor_links`, `vendor_sync_state`, Telegram identity/link tables). RLS default-deny; team membership via `merqo.is_merqo_team()`.
- `products` + `vendor_links` are read/written via the **service-role client** (server-only) so `metrics_secret` never reaches a browser.
- kit → merqo HTTP calls (customer/vendor Telegram connect) are gated by the bearer-secret guard `customerNotifySecretOk` (`MERQO_CUSTOMER_SECRET`); every other cross-kit call flows merqo → kit.
- Full schema, RPCs, Telegram phases and specs: `docs/DATA-MODEL.md`.

## Rules (always)

- TypeScript strict — no `any`, no `@ts-ignore`.
- Validate all user input with Zod `safeParse()` at every boundary.
- Authorization lives in **RLS policies** + the service-role boundary, not app code.
- Use the **service-role client only** in Server Actions / Route Handlers.
- No secrets in `NEXT_PUBLIC_*`. `NEXT_PUBLIC_SUPABASE_*` are inlined at build.
- Cross-kit data goes over the **HTTP metrics API** (bearer secret), never a direct
  cross-schema query. Never touch qkit's `public.*` from merqo.
- After editing the schema, add a new numbered migration in `supabase/migrations/`.
- **Comments (tc 5.8):** explain WHY not what; prefer own-line, trailing sparingly
  (`no-inline-comments: warn`); no commented-out code; no change-narration
  (`was X`, `added`, dates, ticket refs — that lives in the commit); JSDoc on
  exports documents the contract, not the implementation.

## Skills

### Project skills — check here first (`.claude/skills/`)

| Skill               | What it does                              |
| ------------------- | ----------------------------------------- |
| `/next-verify`      | typecheck + lint + test in one pass       |
| `/supabase-migrate` | apply `supabase/migrations` (safety gate) |

### templateCentral plugin skills

templateCentral has **no Supabase support**. Use only the stack-agnostic ones:
`templatecentral:standards` (naming/validation drift). Do **not** run
`templatecentral:add (auth)` or `(database)` — they install better-auth / Drizzle
and will break RLS.
The templateCentral 6.0.4 review and earlier adoption history live in
`docs/meta/templatecentral-adoption-log.md`.

## AI Harness

Hook scripts live in `.claude/hooks/` (not inlined in `settings.json`); the manifest is `.claude/harness.json`. Full reference: `docs/meta/ai-harness-reference.md`.

- PreToolUse(Read|Edit|Write) hard-blocks secret-file reads and writes (env files except blank templates, secret directories, certificate/credential files). Governance and CI/CD writes require human approval; their reads are allowed. The Bash guard blocks hook bypasses, protected-branch force pushes and destructive guard edits.
- UserPromptSubmit blocks credential-shaped input; injection-phrase matches only add advisory context.
- PostToolUse typecheck and comment-hygiene hooks are feedback-only. `Stop` runs `pnpm test --run`; `SubagentStop` type-gates uncommitted TS changes. `SessionStart` prints the always-on invariants only (this file is loaded through the `CLAUDE.md` import).
- `permissions.deny` covers secret reads/edits and irreversible ops (`rm -rf`, force push, `git reset --hard`, `git clean -fd/-fx`, `git filter-branch`, ref-delete). `permissions.ask` gates edits to AGENTS.md / CLAUDE.md / settings.json / harness.json.
- `regen-harness.sh` is human-run only; an agent must not re-bless its own baseline.
- Git hooks (husky): pre-commit format/lint/typecheck + lockfile-sync + gitleaks; commit-msg enforces Conventional Commits; pre-push runs the harness integrity check + quality gate.
- CI (`ci.yml`, 8 jobs): `test`, `build`, `e2e`, `e2e-admin`, `changelog`, `readme-freshness`, `comment-hygiene`, `db`. `security.yml` runs gitleaks + the fail-closed deps gate `.claude/deps-gate.sh` (`pnpm audit` high/critical; expiring suppressions only in `.claude/dep-audit-allow.txt`; no CodeQL). Actions are pinned to commit SHAs.

> Note: unlike the qkit reference, `settings.json` here omits the broad
> `permissions.allow` list (each session grants tools interactively). Add an
> allow-list if you want fewer prompts.

## Skills Security

- Review `SKILL.md` before installing any third-party skill — treat skills like packages.
- Scope `allowed-tools:` to the minimum (e.g. `Bash(git *)` not `Bash`).
- Never install skills that hardcode secrets or make unlisted outbound calls.

## Project-specific notes

- Adoption history (templateCentral 5.8 / 5.15 / 6.0.4 reviews, husky migration, Telegram phases): `docs/meta/templatecentral-adoption-log.md`.
- Landing design spec: `docs/superpowers/specs/2026-07-06-merqo-home-landing-design.md`.
- Deploy runbook: `docs/DEPLOY.md`. Telegram bot runbook: `docs/TELEGRAM.md`.
- Telegram connect must be merged and deployed (env vars set, `setWebhook` called, see `docs/DEPLOY.md`) before qkit and loopkit can run against real endpoints.

<!-- [[post-harness]] — reserved for trace capture and meta-harness integration -->
