import type { IncidentKind, VendorActivityPayload } from "@merqo/ui/contracts";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";

export const INCIDENT_LABELS: Record<IncidentKind, string> = {
  payment_callback_failed: "Payment callback failed",
  payment_claim_stuck: "Payment claim stuck",
  print_failed: "Print failed",
  print_stuck: "Print stuck",
  webhook_rejected: "Webhook rejected",
  action_error: "Action error",
};

/** A kit's 72-hour incident summary: kinds, counts and reference ids only. */
export function IncidentList({
  incidents,
  recent,
  now,
}: {
  incidents?: VendorActivityPayload["incidents"];
  recent?: VendorActivityPayload["recent"];
  now: number;
}) {
  const hasIncidents = (incidents?.length ?? 0) > 0;
  const hasRecent = (recent?.length ?? 0) > 0;

  return (
    <div className="mt-3 border-t pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Incidents (last 72 h)
      </h3>
      {!hasIncidents && !hasRecent ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          No incidents in the last 72 hours
        </p>
      ) : (
        <>
          {hasIncidents && (
            <ul className="mt-2 space-y-1.5">
              {incidents?.map((i) => (
                <li
                  key={i.kind}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-1.5">
                    {INCIDENT_LABELS[i.kind]}
                    <Badge
                      variant="destructive"
                      className="border-0 px-1.5 py-0"
                    >
                      ×{i.count}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    last {timeAgo(i.lastAt, now)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {hasRecent && (
            <ul className="mt-2 space-y-1 text-xs">
              {recent?.map((r) => (
                <li
                  key={`${r.kind}-${r.ref}-${r.at}`}
                  className="flex flex-wrap items-center gap-x-2 text-muted-foreground"
                >
                  <span>{INCIDENT_LABELS[r.kind]}</span>
                  <span className="font-mono text-foreground">{r.ref}</span>
                  <span className="font-mono">{r.code}</span>
                  <span>{timeAgo(r.at, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
