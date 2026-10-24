import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

// All operator areas require a session. Everything else (landing, /login,
// /no-access) is public. Merqo-team membership is additionally enforced in each
// /admin page via requireMerqoTeam(); /dashboard needs only a session
// (requireVendorSession). The proxy only guarantees a session.
function isProtectedPath(path: string): boolean {
  return path.startsWith("/admin") || path.startsWith("/dashboard");
}

function isAuthTokenCookieName(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

// Names that appear twice in the raw Cookie header: a host-only cookie from
// before the shared .merqo.io domain, plus the domain-scoped one. The parsed
// cookie jar keeps one per name, so only the raw header shows the pair.
function duplicatedAuthCookieNames(request: NextRequest): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const name = part.split("=")[0].trim();
    if (!isAuthTokenCookieName(name)) continue;
    if (seen.has(name)) duplicated.add(name);
    seen.add(name);
  }
  return [...duplicated];
}

// A Set-Cookie with no Domain expires only the host-only copy, leaving the
// domain-scoped one. Runs on every request until the duplicate is gone (a
// one-time marker let a re-created duplicate send the vendor back to /login).
// `writtenThisPass` holds the names @supabase/ssr just wrote this request:
// ResponseCookies keys by name, so clearing one would overwrite the fresh
// session, and the next request retries instead.
function clearHostOnlyDuplicates(
  request: NextRequest,
  response: NextResponse,
  writtenThisPass: ReadonlySet<string>,
) {
  if (!process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN) return;
  for (const name of duplicatedAuthCookieNames(request)) {
    if (writtenThisPass.has(name)) continue;
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const cookiesWrittenBySupabase = new Set<string>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
            cookiesWrittenBySupabase.add(name);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
      cookieOptions: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN
        ? { domain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN }
        : undefined,
    },
  );

  // Refresh the session on EVERY request, not just protected ones. @supabase/ssr
  // rotates the auth cookies as a side effect of getUser(); skipping it on public
  // routes (the landing, /login) lets the access token age out with no refresh,
  // which silently logs the user out when they return. Run getUser() first, then
  // apply the login gate only for protected paths.
  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = error ? null : data.user;
  } catch {
    // Auth unreachable — degrade to unauthenticated.
    user = null;
  }

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    clearHostOnlyDuplicates(
      request,
      redirectResponse,
      cookiesWrittenBySupabase,
    );
    return redirectResponse;
  }

  clearHostOnlyDuplicates(request, supabaseResponse, cookiesWrittenBySupabase);
  return supabaseResponse;
}
