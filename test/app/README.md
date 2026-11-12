# test/app

Application boundary tests using mocked Supabase and shared UI dependencies. Cover login and recovery validation, shared-profile field patches, admin overview failures and team access states. These tests verify call ownership and UI behavior; database policies are exercised separately by pgTAP and authenticated workflows by browser tests. Kit URL fixtures use the `*.merqo.io` production hosts.

Profile regressions verify independent simultaneous saves, rejected-save feedback and retry with values retained. Avatar storage cleanup regressions are colocated in src/app/profile/.

`admin-overview-health.test.tsx` renders the overview and products pages with only the registry, grants, support and metrics dependencies mocked, and stubs the products page's tenant-health section.

`slug-boundary.test.ts` proves malformed kit slugs never reach the vendor context.

`waitlist-action.test.ts` covers the public `/waitlist` Server Action: slug validation against the in-build kits and the email schema.

`waitlist-action.test.ts` also covers the `updatesOptIn` checkbox (ticked, unticked, bad value).

`login-rejections.test.tsx` and `waitlist-action.test.ts` mock the rate limiter and the sign-in action; the limiter itself is tested in `src/lib`.

`login-page.test.tsx` and `login-rejections.test.tsx` assert the friendly auth error copy from `src/lib/auth-error-copy.ts` rather than raw provider messages, while `profile-form.test.tsx` checks the "Business name" field and rejected-save retry, and `profile-actions.test.ts` checks the friendly profile save error when the RPC throws.

`vendor-list.test.tsx` and `admin-overview-health.test.tsx` assert the admin empty-state copy ("No vendors yet", "No products yet", "No live products yet").

Tests that mocked the deleted local primitive paths import from `@merqo/ui/primitives` instead.

`savings-summary.test.tsx` asserts the dashboard Pro estimate line ("more with Pro features") shows only when there is upside and never reads as an upgrade prompt.
