# src/app/admin/feedback

Team-gated feedback overview with bounded reads: 200 hub responses and 500 kit responses. Query failures surface as errors instead of an empty feedback state. NPS totals and comment lists are derived from the same fetched rows.

Page header follows the shared admin pattern (Admin eyebrow, display title equal to the nav label, one-line description) and sets its browser title via `metadata`.
