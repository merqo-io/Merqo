import { NextResponse } from "next/server";
import { loadPublicPlanCatalog } from "@/lib/pricing/public-catalog";

// Prices change rarely; five minutes keeps the CDN and the database calm
// while a price edit still reaches kit pages quickly.
export const revalidate = 300;

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

/** Public, unauthenticated plan catalog that kit plan pages fetch server-side. */
export async function GET(): Promise<Response> {
  try {
    const catalog = await loadPublicPlanCatalog();
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (err) {
    console.error("plans route failed", err);
    return NextResponse.json(
      { error: "Plans are unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
