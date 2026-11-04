import { requireMerqoTeam } from "@/lib/team";
import { listVendorGrants, listProducts } from "@/lib/admin";
import { FOUNDER_CAP, countFounders } from "@/lib/entitlements/store";
import { GrantForm } from "./grant-form";
import { VendorList } from "./vendor-list";

export const revalidate = 0;

export const metadata = { title: "Vendors" };

export default async function VendorsPage() {
  await requireMerqoTeam();
  const [grants, products, founders] = await Promise.all([
    listVendorGrants(),
    listProducts(),
    countFounders(),
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-5 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Admin
        </p>
        <h1 className="font-display text-3xl font-semibold leading-none sm:text-4xl">
          Vendors
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Grant kit access and see who owns what. Founder slots left:{" "}
          {Math.max(0, FOUNDER_CAP - founders)} of {FOUNDER_CAP}.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold">Grant a kit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Give a vendor active access, even if they never joined the waitlist.
        </p>
        <GrantForm products={products} />
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">All vendors</h2>
        <VendorList grants={grants} products={products} />
      </section>
    </main>
  );
}
