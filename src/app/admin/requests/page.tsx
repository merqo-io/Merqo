import Link from "next/link";
import { requireMerqoTeam } from "@/lib/team";
import {
  listPendingRequests,
  vendorEmailsById,
} from "@/lib/subscription-requests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@merqo/ui/primitives";
import { DeclineButton } from "./decline-button";

export const revalidate = 0;

export const metadata = { title: "Requests" };

const KIND_LABELS = {
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  cancel: "Cancel",
} as const;

export default async function RequestsPage() {
  await requireMerqoTeam();
  const requests = await listPendingRequests();
  const emails = await vendorEmailsById(requests.map((r) => r.vendorId));

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Admin
        </p>
        <h1 className="font-display text-3xl font-semibold leading-none sm:text-4xl">
          Requests
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plan changes vendors asked for from their dashboard. Resolve one by
          making the change on the vendor page.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No pending requests. Plan changes vendors ask for show up here.
        </div>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => {
            const email = emails.get(r.vendorId);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-sm"
              >
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm">
                    <Badge variant="muted" className="border-0 px-1.5 py-0">
                      {KIND_LABELS[r.kind]}
                    </Badge>
                    <span className="font-medium">{email ?? r.vendorId}</span>
                    <span className="font-mono text-muted-foreground">
                      {r.planSlug}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.createdAt.slice(0, 10)}
                    {r.note ? `, ${r.note}` : ""}
                  </p>
                </div>
                {email && (
                  <div className="flex items-center gap-2">
                    <Button asChild size="xs" variant="outline">
                      <Link
                        href={`/admin/vendors/${encodeURIComponent(email)}?request=${r.id}`}
                      >
                        Resolve
                      </Link>
                    </Button>
                    <DeclineButton requestId={r.id} email={email} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
