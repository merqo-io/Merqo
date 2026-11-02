import { describe, it, expect } from "vitest";
import {
  KITS,
  KIT_STATUS_EXPLAINER,
  KIT_STATUS_LABEL,
  PRICING_LINE,
  WAITLISTABLE_SLUGS,
} from "@/lib/kits";

describe("kit family config", () => {
  it("has the four kits shown publicly", () => {
    expect(KITS.map((k) => k.slug)).toEqual([
      "qkit",
      "loopkit",
      "paykit",
      "stockkit",
    ]);
  });

  it("lists only qkit as piloting; the rest are in build", () => {
    const byStatus = (s: string) =>
      KITS.filter((k) => k.status === s).map((k) => k.slug);
    expect(byStatus("piloting")).toEqual(["qkit"]);
    expect(byStatus("in-build")).toEqual(["loopkit", "paykit", "stockkit"]);
  });

  it("labels and explains each status without any live signal", () => {
    expect(KIT_STATUS_LABEL).toEqual({
      piloting: "Piloting",
      "in-build": "In build",
    });
    expect(KIT_STATUS_EXPLAINER).toEqual({
      piloting: "Running with a few vendors",
      "in-build": "Built, not yet tried with vendors",
    });
  });

  it("never publishes unreleased or retired kits", () => {
    const slugs = KITS.map((k) => k.slug);
    for (const gone of ["shopkit", "reachkit", "slotkit", "tapkit"]) {
      expect(slugs).not.toContain(gone);
    }
  });

  it("every kit has a link and a plain-language tagline", () => {
    for (const k of KITS) {
      expect(k.href).toBeTruthy();
      expect(k.tagline.length).toBeGreaterThan(10);
    }
  });

  it("only in-build kits are waitlistable", () => {
    expect(WAITLISTABLE_SLUGS).toEqual(["loopkit", "paykit", "stockkit"]);
  });

  it("states one pricing line with the 30 days' notice condition", () => {
    expect(PRICING_LINE).toBe(
      "Free during the pilot. If we start charging, you'll get at least 30 days' notice first.",
    );
    for (const k of KITS) {
      expect(k.features.join(" ")).not.toMatch(/free|pro tier/i);
    }
  });

  it("has unique slugs", () => {
    const slugs = KITS.map((k) => k.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every kit has a fuller description and at least 3 feature bullets", () => {
    for (const k of KITS) {
      expect(k.description.length).toBeGreaterThan(30);
      expect(k.features.length).toBeGreaterThanOrEqual(3);
      for (const f of k.features) expect(f.length).toBeGreaterThan(5);
    }
  });
});
