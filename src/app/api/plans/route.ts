import { NextResponse } from "next/server";
import { guardBearerRoute } from "@/lib/bearer-guard";
import { loadPublicPlanCatalog } from "@/lib/pricing/public-catalog";

export const dynamic = "force-dynamic";

// Credential-gated, so a shared CDN must never store it.
const NO_STORE = "private, no-store";

/** Plan catalog that kit plan pages fetch server-side with the kit bearer secret. */
export async function GET(request: Request): Promise<Response> {
  const rejected = await guardBearerRoute(request, "plans");
  if (rejected) {
    rejected.headers.set("Cache-Control", NO_STORE);
    return rejected;
  }
  try {
    const catalog = await loadPublicPlanCatalog();
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": NO_STORE },
    });
  } catch (err) {
    console.error("plans route failed", err);
    return NextResponse.json(
      { error: "Plans are unavailable" },
      { status: 500, headers: { "Cache-Control": NO_STORE } },
    );
  }
}
