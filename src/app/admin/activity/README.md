# src/app/admin/activity

The team-gated activity page reads the latest 100 audit entries and converts them to serializable shared-UI rows. The client adapter owns the action labels (including `view_vendor`, written when a vendor detail page is opened, with only an email hash) and the CSV download callback; service-role access and actor resolution stay on the server.
