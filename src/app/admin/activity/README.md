# src/app/admin/activity

The team-gated activity page reads the latest 100 audit entries and converts them to serializable shared-UI rows. The client adapter owns the action labels (including the subscription and event pass actions `grant_subscription`, `cancel_subscription`, `mint_event_pass`, `cancel_event_pass`, `repush_entitlements`, `resolve_subscription_request` and `decline_subscription_request`, and `view_vendor`, written when a vendor detail page is opened, with only an email hash) the CSV download callback and the label for the retired `toggle_bundle_discount` action (historical rows only); service-role access and actor resolution stay on the server.

Page header follows the shared admin pattern (Admin eyebrow, display title equal to the nav label, one-line description) and sets its browser title via `metadata`.

Empty states use the shared `EmptyState size="compact"` from `@merqo/ui`; there is no local dashed box.
