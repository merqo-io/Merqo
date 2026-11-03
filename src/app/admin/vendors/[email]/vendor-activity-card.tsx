import { StatTile, StatusBadge } from "@merqo/ui";
import type { VendorActivityResult } from "@/lib/vendor-activity-client";
import { VENDOR_ACTIVITY_STATUS_CONFIG } from "./vendor-activity-status-config";
import { timeAgo } from "@/lib/format";
import { IncidentList } from "./incident-list";

/** One kit's activity summary on the vendor detail page. A kit that
 *  hasn't implemented `/api/merqo/vendor-activity` yet, or is briefly
 *  unreachable, renders nothing here — never a broken-looking card (same
 *  degrade-never-fail convention the metrics pull already follows). */
export function VendorActivityCard({
  slug,
  result,
  now,
}: {
  slug: string;
  result: VendorActivityResult;
  now: number;
}) {
  if (!result.ok || !result.data.active) return null;
  const { status, metrics, lastActivityAt, incidents, recent } = result.data;

  return (
    <div className="min-w-0 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 break-all font-mono text-sm font-semibold">
          {slug}
        </span>
        <div className="flex items-center gap-1.5">
          {status && (
            <StatusBadge
              status={status}
              config={VENDOR_ACTIVITY_STATUS_CONFIG}
            />
          )}
        </div>
      </div>

      {metrics.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No metrics reported.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <StatTile key={m.label} label={m.label} value={m.value} />
          ))}
        </div>
      )}

      <IncidentList incidents={incidents} recent={recent} now={now} />

      <p className="mt-3 text-[0.7rem] text-muted-foreground">
        {lastActivityAt
          ? `Last activity ${timeAgo(lastActivityAt, now)}`
          : "No activity recorded"}
      </p>
    </div>
  );
}
