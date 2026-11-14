import { createHash } from "node:crypto";
import { z } from "zod";
import Link from "next/link";
import { BackButton, EmptyState } from "@merqo/ui";
import { notFound } from "next/navigation";
import { requireMerqoTeam } from "@/lib/team";
import { getVendorGrant, listProducts, recordAudit } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import { GrantForm } from "../grant-form";
import { RevokeButton } from "../revoke-button";
import { listLiveProducts } from "@/lib/products";
import { getVendorActivity } from "@/lib/vendor-activity-client";
import { loadPlanCatalog } from "@/lib/pricing/catalog";
import {
  countFounders,
  findVendorId,
  loadSyncRows,
  loadVendorEventPasses,
  loadVendorSubscriptions,
} from "@/lib/entitlements/store";
import { sgDay } from "@/lib/sg-date";
import { getPendingRequest } from "@/lib/subscription-requests";
import { VendorActivityCard } from "./vendor-activity-card";
import { getEventPassUsage } from "@/lib/event-pass-usage-client";
import { SubscriptionSection } from "./subscription-section";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  return { title: decodeURIComponent(email) };
}

async function loadBilling(vendorId: string, requestId: string | undefined) {
  const [subscriptions, eventPasses, syncRows, founderCount, catalog, request] =
    await Promise.all([
      loadVendorSubscriptions(vendorId),
      loadVendorEventPasses(vendorId),
      loadSyncRows(vendorId),
      countFounders(),
      loadPlanCatalog(),
      z.string().uuid().safeParse(requestId).success
        ? getPendingRequest(requestId as string, vendorId)
        : null,
    ]);
  const pass = catalog.find((p) => p.kind === "event_pass" && p.active);
  const nowMs = Date.now();
  // Usage is only meaningful once a pass has started; settled and cancelled
  // passes show recorded figures instead of a live read.
  const live = eventPasses.filter(
    (p) => p.status === "active" && Date.parse(p.startsAt) <= nowMs,
  );
  const passUsage = Object.fromEntries(
    await Promise.all(
      live.map(
        async (p) =>
          [
            p.id,
            await getEventPassUsage({
              vendorId,
              startsAt: p.startsAt,
              endsAt: p.endsAt,
            }),
          ] as const,
      ),
    ),
  );
  return {
    subscriptions,
    eventPasses,
    passUsage,
    syncRows,
    founderCount,
    plans: catalog.filter(
      (p) =>
        p.active &&
        (p.kind === "kit" || p.kind === "starter" || p.kind === "bundle"),
    ),
    eventTerms: pass?.eventPass ?? null,
    request: request
      ? { id: request.id, planSlug: request.planSlug, kind: request.kind }
      : null,
  };
}

export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ email: string }>;
  searchParams: Promise<{ request?: string }>;
}) {
  const { user } = await requireMerqoTeam();
  const { email: raw } = await params;
  const email = decodeURIComponent(raw);
  const { request: requestId } = await searchParams;
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
  const vendorId = await findVendorId(grant.email);
  const billing = vendorId ? await loadBilling(vendorId, requestId) : null;
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
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Admin
        </p>
        <h1 className="break-all font-display text-3xl font-semibold leading-none sm:text-4xl">
          {grant.email}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kits, subscriptions and activity for this vendor.
        </p>
      </div>

      <section>
        <h2 className="font-display text-lg font-bold">Kits</h2>
        {grant.kits.length === 0 ? (
          <EmptyState
            size="compact"
            className="mt-3"
            title="No kits yet. Grant one below."
          />
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

      {billing ? (
        <SubscriptionSection
          email={grant.email}
          {...billing}
          today={sgDay(now)}
          nowMs={now}
        />
      ) : (
        <EmptyState
          size="compact"
          title="This vendor has no Merqo account yet, so subscriptions and event passes unlock after they sign in once."
        />
      )}

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
