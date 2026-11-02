import { describe, it, expect } from "vitest";
import {
  resolveHome,
  tilesForLinks,
  hasRenderableActiveKit,
  addableKits,
  provisionableKits,
  kitCardAction,
  hasActiveLinkFor,
} from "@/lib/vendor";

describe("resolveHome", () => {
  it("routes a team member to /admin", () => {
    expect(resolveHome({ isTeam: true })).toBe("/admin");
  });
  it("routes everyone else to /dashboard — the dashboard is open to any signed-in user", () => {
    expect(resolveHome({ isTeam: false })).toBe("/dashboard");
  });
});

describe("tilesForLinks", () => {
  it("splits active vs waitlist and maps slug→KITS metadata", () => {
    const { active, pending } = tilesForLinks([
      { product_slug: "qkit", status: "active" },
      { product_slug: "loopkit", status: "waitlist" },
    ]);
    expect(active.map((t) => t.slug)).toEqual(["qkit"]);
    expect(active[0].name).toBe("qkit");
    expect(active[0].href).toBeTruthy();
    expect(pending.map((t) => t.slug)).toEqual(["loopkit"]);
  });
  it("drops unknown/removed slugs (config is the display allow-list)", () => {
    const { active, pending } = tilesForLinks([
      { product_slug: "ghostkit", status: "active" },
    ]);
    expect(active).toEqual([]);
    expect(pending).toEqual([]);
  });
});

describe("hasRenderableActiveKit", () => {
  it("is true for an active link whose slug is in KITS", () => {
    expect(
      hasRenderableActiveKit([{ product_slug: "qkit", status: "active" }]),
    ).toBe(true);
  });
  it("is false when the only active link has an unknown slug", () => {
    expect(
      hasRenderableActiveKit([{ product_slug: "ghostkit", status: "active" }]),
    ).toBe(false);
  });
  it("is false when the only known kit is waitlist, not active", () => {
    expect(
      hasRenderableActiveKit([{ product_slug: "loopkit", status: "waitlist" }]),
    ).toBe(false);
  });
});

describe("tilesForLinks plan passthrough", () => {
  it("carries plan through on an active tile", () => {
    const { active } = tilesForLinks([
      { product_slug: "qkit", status: "active", plan: "pro" },
    ]);
    expect(active[0].plan).toBe("pro");
  });

  it("leaves plan undefined when the link has none", () => {
    const { active } = tilesForLinks([
      { product_slug: "qkit", status: "active" },
    ]);
    expect(active[0].plan).toBeUndefined();
  });
});

describe("tilesForLinks lastVerifiedAt passthrough", () => {
  it("carries last_verified_at through on an active tile", () => {
    const { active } = tilesForLinks([
      {
        product_slug: "qkit",
        status: "active",
        last_verified_at: "2026-07-09T00:00:00.000Z",
      },
    ]);
    expect(active[0].lastVerifiedAt).toBe("2026-07-09T00:00:00.000Z");
  });

  it("leaves lastVerifiedAt undefined on a pending (waitlist) tile", () => {
    const { pending } = tilesForLinks([
      {
        product_slug: "loopkit",
        status: "waitlist",
        last_verified_at: "2026-07-09T00:00:00.000Z",
      },
    ]);
    expect(pending[0].lastVerifiedAt).toBeUndefined();
  });
});

const kit = (slug: string, status: "piloting" | "in-build") => ({
  slug,
  name: slug,
  tagline: `${slug} tagline for vendors.`,
  description: `${slug} does something useful for a small seller.`,
  features: ["One", "Two", "Three"],
  status,
  href: `https://${slug}.merqo.io`,
});

describe("addableKits", () => {
  const kits = [kit("qkit", "piloting"), kit("loopkit", "in-build")];

  it("includes every kit the vendor has no vendor_links row for", () => {
    const out = addableKits([], kits);
    expect(out.map((t) => t.slug)).toEqual(["qkit", "loopkit"]);
    expect(out[0].href).toBe("https://qkit.merqo.io");
    expect(out[0].description).toBeTruthy();
  });

  it("excludes a kit that already has any vendor_links row", () => {
    expect(
      addableKits([{ product_slug: "qkit" }], kits).map((t) => t.slug),
    ).toEqual(["loopkit"]);
  });
});

describe("provisionableKits", () => {
  // paykit mirrors a real case: it is in kits.ts but has no vendor-provision
  // route, so it is absent from `liveSlugs` (derived from
  // merqo.products.provision_secret).
  const kits = [
    kit("qkit", "piloting"),
    kit("loopkit", "in-build"),
    kit("paykit", "in-build"),
  ];
  const liveSlugs = new Set(["qkit", "loopkit"]);

  it("includes a provisionable kit the vendor has no vendor_links row for", () => {
    const out = provisionableKits([], liveSlugs, kits);
    expect(out.map((k) => k.slug)).toEqual(["qkit", "loopkit"]);
  });

  it("excludes a kit in kits.ts but absent from liveSlugs (no provisioning capability)", () => {
    const out = provisionableKits([], liveSlugs, kits);
    expect(out.map((k) => k.slug)).not.toContain("paykit");
  });

  it("excludes a provisionable kit the vendor already has any vendor_links row for", () => {
    expect(
      provisionableKits([{ product_slug: "qkit" }], liveSlugs, kits),
    ).toEqual([kits[1]]);
  });
});

describe("hasActiveLinkFor", () => {
  it("is true for a matching active link", () => {
    expect(
      hasActiveLinkFor([{ product_slug: "qkit", status: "active" }], "qkit"),
    ).toBe(true);
  });

  it("is false for a waitlist link to the same slug", () => {
    expect(
      hasActiveLinkFor([{ product_slug: "qkit", status: "waitlist" }], "qkit"),
    ).toBe(false);
  });

  it("is false when there's no link at all", () => {
    expect(hasActiveLinkFor([], "qkit")).toBe(false);
  });

  it("is false for an active link to a different slug", () => {
    expect(
      hasActiveLinkFor([{ product_slug: "loopkit", status: "active" }], "qkit"),
    ).toBe(false);
  });
});

describe("kitCardAction", () => {
  it("activates a provisionable kit, waitlists an in-build kit, logs in to a piloting kit", () => {
    expect(kitCardAction(kit("loopkit", "in-build"), true)).toBe("activate");
    expect(kitCardAction(kit("paykit", "in-build"), false)).toBe("waitlist");
    expect(kitCardAction(kit("qkit", "piloting"), false)).toBe("login");
  });
});
