# profile

Shared account settings for the vendor dashboard and team console. The page and
mutating actions require a signed-in user; profile identity comes from the
verified session, never a submitted user ID. The account menu's
`/dashboard/profile` link redirects to this `/profile` route.

## Data ownership

`actions.ts` validates stall-name and social-link input, then invokes the
owner-scoped `patch_vendor_profile` RPC. Each save changes only its own column;
concurrent edits to the other column survive. Missing shared rows are provisioned
atomically. Empty social links clear links; omitted fields remain unchanged.
The page reads the shared profile through `getOrCreateVendorProfile`.

`profile-form.tsx` composes five route-local sections. Each section owns its pending and validation state, so one save does not block another. The avatar, display-name and password sections use the browser Supabase auth client for display name,
avatar metadata and password. These fields are shared by the Supabase account,
not kit-local records. Shared sections/social fields/image uploader come from
`@merqo/ui`; `lib/image-upload-adapter.ts` owns Storage uploads and best-effort
cleanup. Successful replacement cleans up the previous object; returned save
errors restore the previous visible avatar and attempt unused-upload cleanup.
An uncertain network outcome is not proof that a metadata write did not commit.

## Vendor Telegram

`vendor-telegram-actions.ts` mints a vendor link token or disconnects the
session user's own connection through the service client.
`vendor-telegram-connect.tsx` adapts action results to the shared Telegram
section's failure contract and refreshes after disconnect. The page reads the
current connection with its own-row session/RLS client.

The page sets its tab title to "Profile". The page header's way back to `/dashboard` is `@merqo/ui`'s `BackButton`, given `next/link`.

`loading.tsx` is the route skeleton shown while the session, profile and Telegram lookups resolve; `loading.test.tsx` covers it.

## Verification

Action tests cover validation, verified identity and field-specific patches.
Form tests cover shared UI wiring, auth updates and error behavior. Database
policy and cross-kit shared-session behavior need integration validation.

## Parent

[app](../README.md)

The Telegram actions import the service client directly; an `eslint-disable` description records why (no client write grant).

The vendor Telegram connect QR renders as an `<img>` with a `data:image/svg+xml` URI, and `@merqo/ui` (v0.37.0) allowlists the deep link.

Profile sections show action-specific "Could not ... Try again." errors, and the stall-name field is labelled "Business name" in the UI.

Buttons, inputs, labels, selects, switches and tooltips used here, and cn, are imported from `@merqo/ui/primitives`; there are no local copies.

Server Actions here return the shared `ActionResult` from `@merqo/ui/kit-api`.
