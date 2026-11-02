export type FetchKitJsonResult<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false;
      status: number | null;
      kind: "network" | "http" | "parse" | "schema";
    };

interface KitJsonSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

/** Fetch `url` with a timeout, parse the body as JSON, and validate it
 *  against `schema`. Never throws — every failure mode (network error,
 *  non-2xx status, non-JSON body, schema mismatch) collapses to a
 *  discriminated `ok: false` result carrying the HTTP status (when one was
 *  received) and a `kind`, so each caller can map it onto its own
 *  domain-specific result shape without repeating the AbortController /
 *  timeout / try-catch-parse-then-safeParse scaffolding. */
export async function fetchKitJson<T>(
  url: string | URL,
  schema: KitJsonSchema<T>,
  init: RequestInit = {},
  timeoutMs = 5000,
): Promise<FetchKitJsonResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status, kind: "http" };

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, status: res.status, kind: "parse" };
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success)
      return { ok: false, status: res.status, kind: "schema" };
    return { ok: true, status: res.status, data: parsed.data };
  } catch {
    return { ok: false, status: null, kind: "network" };
  } finally {
    clearTimeout(timer);
  }
}
