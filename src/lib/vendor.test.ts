import { describe, it, expect, vi, beforeEach } from "vitest";

const { redirectMock, getUserMock, fromMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

import {
  tilesForLinks,
  requireVendorSession,
  loadVendorContext,
} from "./vendor";
import { LEGAL_VERSIONS } from "@merqo/ui";

function mockMerqoTeamTable() {
  const maybeSingle = async () => ({ data: null, error: null });
  return { select: () => ({ eq: () => ({ maybeSingle }) }) };
}

function mockLegalAcceptancesTable(
  rows: { doc_type: string; doc_version: string; accepted_at?: string }[],
  error: { message: string } | null = null,
) {
  let document = "";
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: string) => {
      if (column === "doc_type") document = value;
      return query;
    }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(async (limit: number) => ({
      data: error
        ? null
        : rows
            .filter((row) => row.doc_type === document)
            .sort((a, b) =>
              String(b.accepted_at).localeCompare(String(a.accepted_at)),
            )
            .slice(0, limit),
      error,
    })),
  };
  return query;
}

function mockVendorLinksTable() {
  const eq = async () => ({ data: [], error: null });
  return { select: () => ({ eq }) };
}

// requireVendorSession issues three .from() calls when a user is signed in:
// merqo_team (loadVendorContext), vendor_links (loadVendorContext), and
// legal_acceptances (the new gate). Route each by table name so a test only
// has to override the row it cares about.
function mockFrom(overrides: {
  legalAcceptances?: {
    doc_type: string;
    doc_version: string;
    accepted_at?: string;
  }[];
  legalError?: { message: string };
}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "merqo_team") return mockMerqoTeamTable();
    if (table === "legal_acceptances")
      return mockLegalAcceptancesTable(
        overrides.legalAcceptances ?? [],
        overrides.legalError ?? null,
      );
    return mockVendorLinksTable();
  });
}

describe("requireVendorSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom({});
  });

  it("redirects to /login when there is no signed-in user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await requireVendorSession();

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("returns the vendor context without redirecting when signed in and legal acceptance is current", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "vendor@business.sg" } },
    });
    mockFrom({
      legalAcceptances: [
        {
          doc_type: "terms",
          doc_version: LEGAL_VERSIONS.terms,
          accepted_at: "2026-09-05T00:00:00Z",
        },
        {
          doc_type: "privacy",
          doc_version: LEGAL_VERSIONS.privacy,
          accepted_at: "2026-09-05T00:00:00Z",
        },
      ],
    });

    const result = await requireVendorSession();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result.user.id).toBe("u1");
    expect(result.isTeam).toBe(false);
    expect(result.links).toEqual([]);
  });

  it("redirects to /legal/accept when the signed-in vendor has never accepted", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "vendor@business.sg" } },
    });
    mockFrom({ legalAcceptances: [] });

    await requireVendorSession();

    expect(redirectMock).toHaveBeenCalledWith("/legal/accept");
  });

  it("redirects to /legal/accept when the vendor's acceptance is stale (older version)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "vendor@business.sg" } },
    });
    mockFrom({
      legalAcceptances: [
        {
          doc_type: "terms",
          doc_version: "2020-01-01",
          accepted_at: "2020-01-01T00:00:00Z",
        },
        {
          doc_type: "privacy",
          doc_version: LEGAL_VERSIONS.privacy,
          accepted_at: "2026-09-05T00:00:00Z",
        },
      ],
    });

    await requireVendorSession();

    expect(redirectMock).toHaveBeenCalledWith("/legal/accept");
  });

  it("redirects when the vendor's most-recently-accepted (by accepted_at) terms version is stale, even though an earlier acceptance of the current version has a higher doc_version string", async () => {
    // Current version accepted long ago, stale version accepted most recently — only redirects if sorted by accepted_at, not doc_version.
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "vendor@business.sg" } },
    });
    mockFrom({
      legalAcceptances: [
        {
          doc_type: "terms",
          doc_version: LEGAL_VERSIONS.terms,
          accepted_at: "2020-01-01T00:00:00Z",
        },
        {
          doc_type: "terms",
          doc_version: "2020-01-01",
          accepted_at: "2026-09-05T00:00:00Z",
        },
        {
          doc_type: "privacy",
          doc_version: LEGAL_VERSIONS.privacy,
          accepted_at: "2026-09-05T00:00:00Z",
        },
      ],
    });

    await requireVendorSession();

    expect(redirectMock).toHaveBeenCalledWith("/legal/accept");
  });

  describe("legal check logging", () => {
    const user = { id: "u1", email: "vendor@business.sg" };

    it("logs the error and fails closed when the read fails", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      getUserMock.mockResolvedValue({ data: { user } });
      mockFrom({ legalError: { message: "permission denied" } });

      await requireVendorSession();

      expect(redirectMock).toHaveBeenCalledWith("/legal/accept");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(errorSpy.mock.calls[0])).toContain(
        "permission denied",
      );
      expect(JSON.stringify(errorSpy.mock.calls[0])).not.toContain(user.email);
      errorSpy.mockRestore();
    });

    it("warns with accepted vs required versions when not current", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      getUserMock.mockResolvedValue({ data: { user } });
      mockFrom({
        legalAcceptances: [{ doc_type: "terms", doc_version: "2020-01-01" }],
      });

      await requireVendorSession();

      expect(redirectMock).toHaveBeenCalledWith("/legal/accept");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.stringify(warnSpy.mock.calls[0]);
      expect(logged).toContain("2020-01-01");
      expect(logged).toContain(LEGAL_VERSIONS.terms);
      expect(logged).not.toContain(user.email);
      warnSpy.mockRestore();
    });

    it("logs nothing when acceptance is current", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      getUserMock.mockResolvedValue({ data: { user } });
      mockFrom({
        legalAcceptances: [
          { doc_type: "terms", doc_version: LEGAL_VERSIONS.terms },
          { doc_type: "privacy", doc_version: LEGAL_VERSIONS.privacy },
        ],
      });

      await requireVendorSession();

      expect(redirectMock).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});

describe("tilesForLinks", () => {
  it("buckets active, waitlist, and needs_setup links separately", () => {
    const { active, pending, needsSetup } = tilesForLinks([
      { product_slug: "qkit", status: "active", plan: "free" },
      { product_slug: "loopkit", status: "waitlist", plan: null },
      { product_slug: "paykit", status: "needs_setup", plan: null },
    ]);
    expect(active.map((t) => t.slug)).toEqual(["qkit"]);
    expect(pending.map((t) => t.slug)).toEqual(["loopkit"]);
    expect(needsSetup.map((t) => t.slug)).toEqual(["paykit"]);
  });

  it("drops a link to a slug KITS doesn't know about, in any bucket", () => {
    const { active, pending, needsSetup } = tilesForLinks([
      { product_slug: "unknown-kit", status: "needs_setup", plan: null },
    ]);
    expect(active).toEqual([]);
    expect(pending).toEqual([]);
    expect(needsSetup).toEqual([]);
  });

  it("never sets plan on a needs_setup tile (plan only means anything once active)", () => {
    const { needsSetup } = tilesForLinks([
      { product_slug: "paykit", status: "needs_setup", plan: "pro" },
    ]);
    expect(needsSetup[0].plan).toBeUndefined();
  });

  it("still populates plan on an active tile", () => {
    const { active } = tilesForLinks([
      { product_slug: "qkit", status: "active", plan: "pro" },
    ]);
    expect(active[0].plan).toBe("pro");
  });
});

it("does not read vendor context when auth returns stale user data with an error", async () => {
  fromMock.mockClear();
  getUserMock.mockResolvedValue({
    data: { user: { id: "stale", email: "stale@example.com" } },
    error: { message: "expired" },
  });
  await expect(loadVendorContext()).resolves.toEqual({
    user: null,
    isTeam: false,
    links: [],
  });
  expect(fromMock).not.toHaveBeenCalled();
});
