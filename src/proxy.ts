import type { NextRequest } from "next/server";
import { createProxy } from "@merqo/ui/next";
import { NONCE_PREFIXES } from "@/lib/nonce-prefixes";
import { updateSession } from "@/lib/supabase/middleware";

// next.config.ts cannot import the ESM-only @merqo/ui, so the CSP (nonce on
// per-request routes, static elsewhere) is set here for every route.
// The proxy is built per request so the Supabase origin follows the current env.
export const proxy = (request: NextRequest) =>
  createProxy({
    updateSession,
    noncePrefixes: NONCE_PREFIXES,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  })(request);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
