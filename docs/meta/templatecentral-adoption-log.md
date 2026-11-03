# templateCentral adoption log

Rehomed from AGENTS.md (the "templateCentral 6.0.4 review" and "Project-Specific Notes" sections). History, not current rules.

## templateCentral 6.0.4 review

**templateCentral 6.0.4 review (2026-10-12):** `harness.json` moved 5.15.0 →
6.0.4, porting the harness qkit adopted in its own 6.0.1 and 6.0.4 reviews
(qkit's `AGENTS.md` holds the full reasoning). The scripts were 3-way merged
against qkit's, so this repo's local lines are kept. Adopted:

- Hook commands anchored on `${CLAUDE_PROJECT_DIR}`, each with a timeout. The
  old relative paths resolved against the shell's current directory.
- `stop-checks.sh` skips the test run on a clean tree; `subagent-stop.sh`
  skips read-only agents; `post-edit-typecheck.sh` reports through
  `additionalContext`.
- The skill-usage matcher (`Skill__.*` never matched; now `Skill`), and
  `NotebookEdit` on the `protect-files.sh` matcher.
- The per-segment `block-no-verify.sh`: closes a hook-skipping flag on push,
  `--force-with-lease`, `HEAD:main`, deleting a protected branch and
  `bash -c` wrappers. A bare `git commit` / `git push` is judged by the
  branch it can land on (the hook input's `cwd` plus every literal `cd`
  target), so a worktree commit is no longer blocked by the main checkout
  sitting on `main`. Anything the hook cannot resolve also judges the
  project root: use a bare `git commit` or `git -C <literal path>`.
- `protect-files.sh`: symlinked parents resolved, `notebook_path` read,
  relative paths anchored on the project root.
- `verify-harness.sh` fails on an unreadable or empty manifest.
- The commit-msg gate accepts `type(scope)!:` and the messages git writes
  itself (`Revert "…"`, `fixup!`, `squash!`, `amend!`).
- The PR-only CI gates (changelog, readme, comment hygiene) fail when
  `origin/<base>` is missing and read the base branch from `env`.
- `post-tool-failure.sh` removed (the agent already sees tool errors).

Not adopted, for qkit's reasons: exec-form hooks (`"command": "bash",
"args": [...]`; a bare `bash` resolved without a shell on Windows can be
the WSL launcher, so any hook that used that form here is now a shell
string), the gitleaks command and allowlist syntax changes, the shared
`.claude/ci-gates.sh`, `.claude/hooks/local/`, and every Azure DevOps and
OpenCode item.

## Project-specific notes

- Adopted into templateCentral (`nextjs@5.8.0` Supabase variant) via
  `templatecentral:migrate` on 2026-07-06 — hand-crafted from qkit boilerplate,
  harness ported from the qkit reference. **5.7→5.8 delta + lefthook adopted:**
  comment hygiene (`no-inline-comments: warn` + the doctrine above),
  `packageManager` currency (`pnpm@11.10.0`), and lefthook (git hooks,
  replacing husky). **Not adopted** (same divergences as qkit):
  - the full tc harness-kit (bespoke CI here), pino route-logging,
    harness-verifier / `.harness-base` re-sync layer, better-auth/Drizzle.
- **husky migration (2026-08-01):** superseded the 2026-07-24 (repo-local:
  see the lefthook-adoption bullet above) git-hook decision — lefthook's
  `lefthook.exe` is unsigned and Windows Smart App Control blocks it
  unconditionally on this machine, with no signed-binary alternative
  available in any distribution channel. husky v9 has no native binary.
  Same checks ported into `.husky/*` shell scripts; see
  `docs/superpowers/specs/2026-08-01-lefthook-to-husky-migration-design.md`.
- Landing design spec: `docs/superpowers/specs/2026-07-06-merqo-home-landing-design.md`.
- Deploy runbook: `docs/DEPLOY.md`.
- **5.14→5.15 delta reviewed (2026-08-15):** adopted `eslint.config.mjs`'s
  switch from one hand-picked sonarjs rule to `sonarjs.configs.recommended`
  (real findings fixed, see PR history) and the `next`/`eslint-config-next`
  `^16.2.12` version floor. Also added `next.config.ts`'s `headers()` (a
  genuine pre-existing gap, not a documented divergence — see the
  headers()-gap PR), built with 5.15's dev-mode CSP/`X-Frame-Options` fix
  already applied (`frame-ancestors`/`X-Frame-Options` only in
  non-development, learned from the bug report rather than reproduced fresh).
  **Not adopted:** `harness-kit.md`'s hook-`command` string→`args[]` array
  form — real and low-risk, but changing `.claude/settings.json` requires
  updating its `origin_hash` in `harness.json`, and `regen-harness.sh` is
  explicitly human-run-only (an agent re-blessing its own baseline defeats
  the drift check) — left for a human to pick up manually. Same standing
  divergences as 5.11→5.14 (full tc harness-kit, pino route-logging,
  better-auth/Drizzle) still apply.
- **Customer Telegram connect, Phase B+D (2026-08-16):** merqo's own third
  Telegram bot (`src/app/api/telegram/webhook/route.ts`), distinct from
  qkit's and loopkit's own Phase A vendor-alert bots, plus two
  bearer-secret endpoints (`src/app/api/merqo/customer-connect-token/`,
  `src/app/api/merqo/notify-customer/`) that qkit and loopkit call —
  **the first kit → merqo HTTP direction in this codebase** (every other
  cross-kit call flows merqo → kit). `notify-customer` has two mutually
  exclusive lookup modes: `notify_ref` (qkit's "waiting" flow, single-use —
  clears `pending_notify_ref` atomically on send) and `phone` (loopkit's
  reuse-only flow — a standing connection, never cleared). See the "Data
  model" section above for the schema, and
  `docs/superpowers/specs/2026-08-16-customer-telegram-connect-design.md`
  for the full design (including the PDPA-researched consent model). This
  must merge and deploy (env vars set, `setWebhook` called — see
  `docs/DEPLOY.md`) before qkit's and loopkit's own customer-telegram-connect
  plans can be implemented against real endpoints.
- **Vendor Telegram connect, Phase A2 (2026-08-16):** consolidates Phase A's
  vendor activity alerts (qkit's order alerts, loopkit's reward alerts) off
  their own separate per-kit bots and onto this same shared bot. Two new
  bearer-secret endpoints (`src/app/api/merqo/vendor-connect-token/`,
  `src/app/api/merqo/notify-vendor/`), a `kind` column on
  `telegram_link_tokens` the webhook route branches on, a new
  `merqo.vendor_telegram` table, and a new `VendorTelegramSection` component
  in `@merqo/ui` (bumped to v0.15.0) wired into `src/app/profile/`. No new
  bot/env-var setup needed — reuses the already-live `TELEGRAM_BOT_TOKEN`/
  `TELEGRAM_WEBHOOK_SECRET` from Phase B+D. **Every vendor who'd previously
  linked qkit's or loopkit's own bot must reconnect once via merqo's profile
  page** — an expected, already-approved consequence of retiring those bots
  because users must initiate contact with merqo's bot before it can send
  alerts; the private chat ID itself remains the user ID. See the "Data
  model" section above and
  `docs/superpowers/specs/2026-08-16-vendor-telegram-connect-design.md`.
  This must merge and deploy before qkit's and loopkit's own Phase A2 plans
  can retire their local bots against a real endpoint.

## Parent

[meta](README.md)
