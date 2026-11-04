# Vendors

Team-gated kit access management. Grant and revoke actions validate input and authorize each request on the server. RevokeButton supplies email and kit slug to ConfirmAdminAction, which handles confirmation, pending dismissal protection and error recovery. Vendor list and grant-form behavior remain domain-specific.

The list page header shows the founder slots left out of 20 (`countFounders` in `@/lib/entitlements/store`). Subscriptions, event passes and kit entitlements are managed per vendor in `[email]/`.

The `loading.tsx` skeleton is a `role="status"` region with `aria-busy`, an `sr-only` label and a reduced-motion fallback.

Page header follows the shared admin pattern (Admin eyebrow, display title equal to the nav label, one-line description) and sets its browser title via `metadata`.
