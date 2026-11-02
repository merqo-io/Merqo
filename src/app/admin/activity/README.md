# src/app/admin/activity

The team-gated activity page reads the latest 100 audit entries and converts them to serializable shared-UI rows. The client adapter owns the action labels (including `view_vendor`, written when a vendor detail page is opened, with only an email hash) the CSV download callback and the label for the retired `toggle_bundle_discount` action (historical rows only); service-role access and actor resolution stay on the server.
