import { createHash } from "node:crypto";
import Link from "next/link";
import { BackButton } from "@merqo/ui";
import { notFound } from "next/navigation";
import { requireMerqoTeam } from "@/lib/team";
import { getVendorGrant, listProducts, recordAudit } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import { GrantForm } from "../grant-form";
import { RevokeButton } from "../revoke-button";
import { listLiveProducts } from "@/lib/products";
import { getVendorActivity } from "@/lib/vendor-activity-client";
import { VendorActivityCard } from "./vendor-activity-card";

export const revalidate = 0;

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { user } = await requireMerqoTeam();
  const { email: raw } = await params;
  const email = decodeURIComponent(raw);
  const [grant, products] = await Promise.all([
    getVendorGrant(email),
    listProducts(),
  ]);
  if (!grant) notFound();

  // A short hash keeps a second copy of the email out of the audit log.
  const emailHash = createHash("sha256")
    .update(grant.email.toLowerCase())
    .digest("hex")
    .slice(0, 12);
  await recordAudit(user.id, "view_vendor", null, { email_hash: emailHash });

  const activeSlugs = new Set(
    grant.kits.filter((k) => k.status === "active").map((k) => k.slug),
  );
  const liveProducts = await listLiveProducts();
  const activityResults = await Promise.all(
    liveProducts
      .filter((p) => activeSlugs.has(p.slug))
      .map((p) => getVendorActivity(p, grant.email)),
  );
  // eslint-disable-next-line react-hooks/purity -- the wall clock is read once per request on purpose
  const now = Date.now();

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
      <div>
        <BackButton
          href="/admin/vendors"
          label="All vendors"
          LinkComponent={Link}
        />
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          {grant.email}
        </h1>
      </div>

      <section>
        <h2 className="font-display text-lg font-bold">Kits</h2>
        {grant.kits.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No kits yet, grant one below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {grant.kits.map((k) => (
              <li
                key={k.slug}
                className="flex items-center justify-between rounded-xl border bg-card p-3.5 shadow-sm"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-mono">{k.slug}</span>
                  <Badge
                    variant={k.status === "active" ? "success" : "muted"}
                    className="border-0 px-1.5 py-0"
                  >
                    {k.status}
                  </Badge>
                </span>
                <RevokeButton email={grant.email} slug={k.slug} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeSlugs.size > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold">Activity</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activityResults.map((result) => (
              <VendorActivityCard
                key={result.slug}
                slug={result.slug}
                result={result}
                now={now}
              />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold">Grant a kit</h2>
        <GrantForm products={products} defaultEmail={grant.email} />
      </section>
    </main>
  );
}
