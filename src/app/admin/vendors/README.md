# Vendors

Team-gated kit access management. Grant and revoke actions validate input and authorize each request on the server. RevokeButton supplies email and kit slug to ConfirmAdminAction, which handles confirmation, pending dismissal protection and error recovery. Vendor list and grant-form behavior remain domain-specific.

The list page header shows the founder slots left out of 20 (`countFounders` in `@/lib/entitlements/store`). Subscriptions, event passes and kit entitlements are managed per vendor in `[email]/`.
