# Products

Team-gated operational view of live kits. The server page fetches each kit through the existing HTTP metrics boundary; ProductHealthCard displays returned health, freshness and latency without inventing missing values (missing fields read "No data yet"). ProductHealthBadge owns the shared Reporting, Lagging and Down labels and variants. DOM tests cover all three states.

`TenantHealthSection` (below the cards) is the per-vendor incident table that used to be `/admin/health`: vendors with incidents in the last 72 hours, or work stuck or needing attention, on any kit they are active on. It passes only each vendor's `active` kit slugs to `getTenantHealth()` (`@/lib/tenant-health`) and renders a `DataTable` with an overall badge, one column per live kit ("No data" when a kit failed or timed out, "-" when the vendor is not on it) and the latest incident time. `getTenantHealth` calls each kit's `/api/merqo/vendor-activity` (6 at a time, 3000 ms timeout); payloads carry incident kinds, counts, reference ids and codes only.

`/admin/health` redirects here.
