# Fresh-eyes close-out sweep

Phase 8 close-out (roadmap X-14, X-15, X-16, X-20). Mechanical findings were fixed in the same PR; anything needing a product, copy or schema decision is listed, not built.

## knip

- Command: `pnpm dlx knip@6.44.2 --no-progress` (the version the sibling repos used). Config: `knip.json`, which ignores `.claude/**` only.
- Before: 1 unused file, 13 unused exports, 11 unused exported types, 0 unused dependencies.
- After: clean, no leftovers.
- The one unused file was `.claude/hooks/user-prompt-guard.cjs`. It is loaded by name from the harness settings, so the whole `.claude/**` tree is ignored rather than the file.
- Removed: `cn` in `lib/utils` (and the direct `clsx` and `tailwind-merge` dependencies it was the only user of; `@merqo/ui` still supplies them), the `lib/admin` re-exports of the three vendor-grant helpers (callers and tests import `lib/vendor-grants` or other `lib/admin` symbols), the `use-async-action` re-export of `navigatingAway`, and five unused types (`EntitlementTier`, `DisplayNameInput`, `PasswordChangeInput`, `MarketingConsent`, `VendorMetric`).
- Un-exported (still used in their own file): `INCIDENT_LABELS`, `badgeVariants`, the four kit URL constants, `SAVINGS_ASSUMPTIONS`, `vendorMetricSchema`, `SyncErrorKind`, `PublicPlan`, `PublicEventPass`, `SavingsAssumption`, `KitSavingsAssumptions`, `TenantHealthKit`.
- Each symbol was grepped across src, test, e2e, scripts and docs first; only plans and specs mention some of them.

## Duplicates

- Inside this repo: none found that were worth extracting. `clientIp` exists once, in `lib/rate-limit.ts`.
- Candidates across sibling kits (not extracted, other repos): `clientIp`, the rate-limit wrapper and the base-URL helpers are likely duplicated per kit. Check `../merqo-ui/docs/usage-matrix.md` before moving any of them into `@merqo/ui`.

## Server vs client components

All 31 `"use client"` files use hooks, event handlers, `react-hook-form` or `@merqo/ui` client components. None looked unnecessary on an import scan.

## Sequential awaits

- Fixed: `app/profile/page.tsx` fetched the vendor profile and the `vendor_telegram` row one after the other; both depend only on the user id, so they now run in `Promise.all`.
- Left alone: `app/mfa/page.tsx` reads the assurance level, redirects on `aal2`, and only then lists factors. Parallelising would add a call on the redirect path.

## loading.tsx

- Added: `app/mfa/loading.tsx` and `app/profile/loading.tsx`, each with a render test.
- `app/no-access/page.tsx`: not needed. It awaits one `auth.getUser()` and the card is almost all static, so a skeleton would only flash.
- `app/page.tsx`, `app/about/page.tsx`, `app/waitlist/page.tsx`: not needed. They await only `auth.getUser()` on public marketing pages, and a skeleton would flash on a landing page.
- `app/legal/accept/page.tsx`: not a gap, it awaits only `searchParams`.
- Gap recorded, not fixed: `app/admin/layout.tsx` and `app/dashboard/(app)/layout.tsx` await data (team check, vendor session, preferences) that a segment's own `loading.tsx` does not cover, because a `loading.tsx` renders inside the layout.

## Bundle size

`pnpm build` in this Next version prints the route table without a First Load JS column, so there are no per-route sizes to report. `.next` was not inspected.

## Coverage

Command CI runs: `pnpm exec vitest --run --coverage`. Overall 93% statements, 93.36% lines; 184 test files, 1054 tests pass. No file under `src/lib` is below 70% lines. Under 70% overall: `app/admin/vendors/grant-form.tsx` (23.5%) and `app/admin/requests/decline-button.tsx` (33.3%), both UI forms rather than business logic.

## Standards

The `templatecentral:standards` skill was not available to this run, so no code-standards, validation-patterns or drift-check findings are folded in.

## Fixed in this PR

- `eslint.config.mjs` ignores `coverage/**` (already in `.gitignore` and `.prettierignore`), so `pnpm check` passes after a local coverage run.
- knip findings above, with `knip.json`.
- `/mfa` and `/profile` loading skeletons and tests.
- Profile page await waterfall.
- Missing README for `src/app/post-login`; the `kit-previews` README already existed and now follows the Purpose and Contents format.
- CHANGELOG stamped as 0.14.0 with an empty `[Unreleased]`, and `package.json` version 0.14.0. No unique bullets were lost and none were collapsed. No git tag.

## Deferred

- Tests for `grant-form.tsx` and `decline-button.tsx`.
- Loading coverage for the admin and dashboard layouts' own awaits.
- `src/components/dashboard/kit-previews/index.ts` is a barrel-style map; AGENTS.md says no barrels, but it exports a slug map, not re-exports, so it was left.

## Needs owner

- Whether to extract `clientIp`, rate-limit and base-URL helpers into `@merqo/ui` once the sibling kits are compared.
- Whether to tag `v0.14.0` after merge.
