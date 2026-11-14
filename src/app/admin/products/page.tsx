import { requireMerqoTeam } from "@/lib/team";
import { listLiveProducts } from "@/lib/products";
import { fetchProductMetrics } from "@/lib/metrics-client";
import { EmptyState } from "@merqo/ui";
import { ProductHealthCard } from "./product-health-card";
import { TenantHealthSection } from "./tenant-health-section";

export const revalidate = 0;

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireMerqoTeam();
  const products = await listLiveProducts();
  const results = await Promise.all(
    products.map((p) => fetchProductMetrics(p)),
  );

  // eslint-disable-next-line react-hooks/purity -- the wall clock is read once per request on purpose
  const now = Date.now();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Admin
      </p>
      <h1 className="font-display text-3xl font-semibold leading-none sm:text-4xl">
        Products
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Per-kit performance and health, then which vendors need attention.
      </p>

      {products.length === 0 ? (
        <EmptyState
          size="compact"
          className="mt-6"
          title="No live products yet. Kits show up here once they go live."
        />
      ) : (
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {products.map((p, i) => (
            <ProductHealthCard
              key={p.slug}
              name={p.name}
              result={results[i]}
              now={now}
            />
          ))}
        </section>
      )}

      <TenantHealthSection products={products} />
    </main>
  );
}
