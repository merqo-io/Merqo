import type { VendorActivityStatus } from "@merqo/ui/contracts";
import type { RegistryRow } from "@/lib/products";
import {
  getVendorActivity,
  type VendorActivityResult,
} from "@/lib/vendor-activity-client";

export type TenantHealthKit = {
  slug: string;
  status: VendorActivityStatus | null;
  incidentCount: number;
  lastAt: string | null;
  ok: boolean;
};

export type TenantHealthRow = {
  email: string;
  perKit: TenantHealthKit[];
  worst: "attention" | "ok" | "unknown";
};

const FLAGGED_STATUSES = new Set<VendorActivityStatus>(["attention", "stuck"]);
const WORST_RANK = { attention: 0, unknown: 1, ok: 2 } as const;

function toKit(result: VendorActivityResult): TenantHealthKit {
  if (!result.ok) {
    return {
      slug: result.slug,
      status: null,
      incidentCount: 0,
      lastAt: null,
      ok: false,
    };
  }
  const incidents = result.data.incidents ?? [];
  const lastAt = incidents.reduce<string | null>(
    (latest, i) => (latest === null || i.lastAt > latest ? i.lastAt : latest),
    null,
  );
  return {
    slug: result.slug,
    status: result.data.status,
    incidentCount: incidents.reduce((sum, i) => sum + i.count, 0),
    lastAt,
    ok: true,
  };
}

function worstOf(perKit: TenantHealthKit[]): TenantHealthRow["worst"] {
  const flagged = perKit.some(
    (k) =>
      k.incidentCount > 0 ||
      (k.status !== null && FLAGGED_STATUSES.has(k.status)),
  );
  if (flagged) return "attention";
  return perKit.some((k) => k.ok) ? "ok" : "unknown";
}

const totalIncidents = (row: TenantHealthRow) =>
  row.perKit.reduce((sum, k) => sum + k.incidentCount, 0);

async function mapPooled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return out;
}

/**
 * Per-vendor incident and status roll-up across the kits each vendor is active
 * on. Returns only vendors that need a look (`attention`, or `unknown` when no
 * kit answered), worst first then most incidents. Never throws: a kit that
 * fails or times out is reported as `ok: false`.
 */
export async function getTenantHealth(
  products: RegistryRow[],
  vendors: { email: string; kits: string[] }[],
  opts: { concurrency?: number; timeoutMs?: number } = {},
): Promise<TenantHealthRow[]> {
  const { concurrency = 6, timeoutMs = 3000 } = opts;
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const calls = vendors.flatMap((v) =>
    v.kits.flatMap((slug) => {
      const product = bySlug.get(slug);
      return product ? [{ email: v.email, product }] : [];
    }),
  );
  const results = await mapPooled(calls, concurrency, (c) =>
    getVendorActivity(c.product, c.email, { timeoutMs }),
  );

  const byEmail = new Map<string, TenantHealthKit[]>();
  calls.forEach((c, i) => {
    const list = byEmail.get(c.email) ?? [];
    list.push(toKit(results[i]));
    byEmail.set(c.email, list);
  });

  const rows: TenantHealthRow[] = [...byEmail].map(([email, perKit]) => ({
    email,
    perKit,
    worst: worstOf(perKit),
  }));

  return rows
    .filter((r) => r.worst !== "ok")
    .sort(
      (a, b) =>
        WORST_RANK[a.worst] - WORST_RANK[b.worst] ||
        totalIncidents(b) - totalIncidents(a) ||
        a.email.localeCompare(b.email),
    );
}
