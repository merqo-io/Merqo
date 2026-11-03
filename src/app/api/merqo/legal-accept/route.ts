import { NextResponse } from "next/server";
import { z } from "zod";
import { KIT_ROUTE_MAX } from "@/lib/kit-route-limits";
import { guardBearerRoute } from "@/lib/bearer-guard";
import { clientIp } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 0;

const bodySchema = z.object({
  vendor_email: z.email(),
  auth_uid: z.uuid().nullable().optional(),
  doc_type: z.enum(["terms", "privacy", "pilot"]),
  doc_version: z.string().min(1).max(KIT_ROUTE_MAX.docVersion),
  doc_sha256: z.string().length(64),
  kit_slug: z.string().min(1).max(KIT_ROUTE_MAX.kitSlug),
  ip: z.string().max(64).optional(),
  // Truncated, not rejected: a long UA must not lose a legal consent record.
  user_agent: z
    .string()
    .transform((ua) => ua.slice(0, KIT_ROUTE_MAX.userAgent))
    .optional(),
});

/**
 * A kit calls this, server-side, once its own gate confirms the signed-in
 * vendor just ticked the acceptance checkbox on its /legal/accept
 * interstitial. Idempotent: a duplicate (vendor_email, doc_type,
 * doc_version) is a unique-constraint violation (Postgres code 23505),
 * treated as success rather than an error. `ip`/`user_agent` are optional —
 * a well-behaved kit forwards its own server action's real incoming
 * headers; if omitted, this falls back to the request's own headers, which
 * only reflect the kit's server-to-server call, not the vendor's browser.
 */
export async function POST(request: Request): Promise<Response> {
  const rejected = await guardBearerRoute(request, "legal-accept");
  if (rejected) return rejected;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const supabase = await createServiceClient();
  const { error } = await supabase.from("legal_acceptances").insert({
    vendor_email: parsed.data.vendor_email.toLowerCase(),
    auth_uid: parsed.data.auth_uid ?? null,
    doc_type: parsed.data.doc_type,
    doc_version: parsed.data.doc_version,
    doc_sha256: parsed.data.doc_sha256,
    kit_slug: parsed.data.kit_slug,
    ip: parsed.data.ip ?? clientIp(request.headers),
    user_agent:
      parsed.data.user_agent ??
      request.headers.get("user-agent")?.slice(0, KIT_ROUTE_MAX.userAgent) ??
      null,
  });

  if (error && error.code !== "23505") {
    console.error("legal-accept: insert failed", error.message);
    return NextResponse.json(
      { ok: false, error: "insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
