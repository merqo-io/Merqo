# AI harness reference

Rehomed from AGENTS.md, which keeps a short summary of the hooks and gates.

Hook scripts live in `.claude/hooks/` (not inlined in `settings.json`):
PreToolUse(Read|Edit|Write): normalize Windows and relative paths; hard-block
secret-file reads and writes (environment files except the blank templates,
secret directories and certificate/credential files). Governance and CI/CD
writes require human approval; their reads are allowed. Ordinary application
code, skills and specifications remain unrestricted. The Bash guard continues
to block hook bypasses, protected-branch force pushes and destructive guard edits.
UserPromptSubmit: credential-shaped input is blocked; injection-phrase matches
produce advisory context so quoted security research can proceed.
PostToolUse(Edit|Write) → `post-edit-typecheck.sh` runs `tsc
--noEmit --incremental` on TS edits, feedback-only, and
`post-edit-comment-check.sh` flags change-narration comments/oversized
comment blocks on TS edits (patterns from
`.claude/comment-hygiene-patterns.txt`), also feedback-only.
PostToolUse(Skill) → `skill-usage-log.sh` appends to
`.claude/skill-usage.log`.
Stop → `stop-checks.sh` exits 0 when `stop_hook_active`; else
runs `pnpm test --run`, exit 2 feeds failures back. SubagentStop →
`subagent-stop.sh` type-gates a subagent's uncommitted TS changes before it
hands back control. SessionStart (startup|resume|clear|compact) →
`session-context.sh` re-injects the first 30 lines of this file plus
always-on invariants.
`permissions`: `deny` covers secret reads/edits (`.env.local` and other
`.env.<env>` variants, `./secrets/**` — `.env.example`/`.env.default`
whitelisted) and irreversible ops (`rm -rf`, `git push --force`/`-f`,
`git reset --hard`, `git clean -fd/-fx`, `git filter-branch`, ref-delete).
`ask` gates edits to AGENTS.md / CLAUDE.md / settings.json / harness.json
(redundant with protect-files.sh's own ask-gate on the same files).
Git hooks (husky): pre-commit runs format/lint/typecheck + lockfile-sync
(`--frozen-lockfile`) + gitleaks secret-scan on staged files, plus a
readme-coupling staleness warning and a comment-hygiene warning (both
excluding `.claude/hooks/*` and `.claude/.harness-base/**` so they can't
flag/reformat scripts off their harness.json baseline); commit-msg enforces
Conventional Commits; pre-push runs the harness integrity check + quality
gate. Migrated 2026-08-01 off lefthook, whose unsigned `lefthook.exe`
Windows Smart App Control blocks unconditionally — see
`docs/superpowers/specs/2026-08-01-lefthook-to-husky-migration-design.md`.
CI (GitHub Actions, `ci.yml`, 8 jobs): `test` (harness integrity, changed-line
coverage via `diff-cover` ≥80%, lockfile-in-sync via `--frozen-lockfile`),
`build` (`next build`), `e2e` (Playwright public smoke), `e2e-admin`
(Playwright admin-interaction flows against a real local Supabase instance),
`changelog` (changelog-touched check), `readme-freshness` (README-coupling
check), `comment-hygiene` (hard-gates change-narration comments introduced by
a PR's added lines — `skip-comment-check` label bypasses), and `db` (pgTAP
RLS suite). Actions are pinned to commit SHAs, not floating version tags.
`security.yml` runs gitleaks + `pnpm audit` — **no CodeQL** (code scanning
requires GitHub Advanced Security, unavailable on this private repo's free
tier; this line previously and incorrectly claimed CodeQL was configured).
`.github/dependabot.yml` (security-only).
Project skills (directory form, `<name>/SKILL.md`): `.claude/skills/` |
Manifest: `.claude/harness.json` (`templatecentral_version: 5.14.0`) — all 26
`seeded_files` entries carry real `origin_hash` values (no `<pending>`
markers); `verify-harness.sh` checks the subset under its guard regex
(`.claude/hooks/`, `.claude/settings.json`, `.claude/(verify|regen)-harness.sh`,
`.husky/`, `.gitleaks.toml`, `.github/workflows/`) against
the git blob at HEAD on every pre-push and in CI.

> Note: unlike the qkit reference, `settings.json` here omits the broad
> `permissions.allow` list (each session grants tools interactively). Add an
> allow-list if you want fewer prompts.

## Parent

[meta](README.md)
