import Link from "next/link";
import { DataTable, StatusBadge, type DataTableColumn } from "@merqo/ui";
import { requireMerqoTeam } from "@/lib/team";
import { listLiveProducts } from "@/lib/products";
import { listVendorGrants } from "@/lib/admin";
import { getTenantHealth, type TenantHealthRow } from "@/lib/tenant-health";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { VENDOR_ACTIVITY_STATUS_CONFIG } from "../vendors/[email]/vendor-activity-status-config";

export const revalidate = 0;

const WORST_BADGE: Record<
  TenantHealthRow["worst"],
  { label: string; variant: "destructive" | "muted" | "success" }
> = {
  attention: { label: "Needs attention", variant: "destructive" },
  unknown: { label: "No data", variant: "muted" },
  ok: { label: "OK", variant: "success" },
};

function lastIncident(row: TenantHealthRow): string | null {
  return row.perKit.reduce<string | null>(
    (latest, k) =>
      k.lastAt && (latest === null || k.lastAt > latest) ? k.lastAt : latest,
    null,
  );
}

function KitCell({ kit }: { kit: TenantHealthRow["perKit"][number] }) {
  if (!kit.ok) {
    return <span className="text-xs text-muted-foreground">No data</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      {kit.status && (
        <StatusBadge
          status={kit.status}
          config={VENDOR_ACTIVITY_STATUS_CONFIG}
        />
      )}
      {kit.incidentCount > 0 && (
        <Badge variant="destructive" className="border-0 px-1.5 py-0">
          {kit.incidentCount} incident{kit.incidentCount === 1 ? "" : "s"}
        </Badge>
      )}
    </span>
  );
}

export default async function AdminHealthPage() {
  await requireMerqoTeam();
  const [products, grants] = await Promise.all([
    listLiveProducts(),
    listVendorGrants(),
  ]);
  const vendors = grants
    .map((g) => ({
      email: g.email,
      kits: g.kits.filter((k) => k.status === "active").map((k) => k.slug),
    }))
    .filter((v) => v.kits.length > 0);
  const rows = await getTenantHealth(products, vendors);
  // eslint-disable-next-line react-hooks/purity -- the wall clock is read once per request on purpose
  const now = Date.now();

  const columns: DataTableColumn<TenantHealthRow>[] = [
    {
      header: "Vendor",
      cell: (row) => (
        <Link
          href={`/admin/vendors/${encodeURIComponent(row.email)}`}
          className="font-medium hover:underline"
        >
          {row.email}
        </Link>
      ),
    },
    {
      header: "Overall",
      cell: (row) => {
        const b = WORST_BADGE[row.worst];
        return (
          <Badge variant={b.variant} className="border-0 px-1.5 py-0">
            {b.label}
          </Badge>
        );
      },
    },
    ...products.map((p): DataTableColumn<TenantHealthRow> => ({
      header: p.name,
      cell: (row) => {
        const kit = row.perKit.find((k) => k.slug === p.slug);
        return kit ? (
          <KitCell kit={kit} />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        );
      },
    })),
    {
      header: "Last incident",
      cell: (row) => {
        const at = lastIncident(row);
        return (
          <span className="text-xs text-muted-foreground">
            {at ? timeAgo(at, now) : "-"}
          </span>
        );
      },
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Internal
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Health
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vendors with incidents in the last 72 hours, or work stuck or needing
          attention on any kit.
        </p>
      </div>
      <section className="mt-6 rounded-xl border bg-card p-2 shadow-sm">
        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.email}
          emptyState={
            <span className="block p-6 text-center">
              No vendor has incidents or stuck work right now.
            </span>
          }
        />
      </section>
    </main>
  );
}
