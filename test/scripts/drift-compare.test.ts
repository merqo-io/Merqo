import { afterEach, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import {
  compareFingerprints,
  main,
  parseCsv,
  readFingerprint,
} from "../../scripts/drift-compare.mjs";

const fixture = (name: string) =>
  fileURLToPath(new URL(`./fixtures/drift/${name}`, import.meta.url));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseCsv", () => {
  it("keeps commas and doubled quotes inside quoted fields", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });
});

describe("compareFingerprints", () => {
  const expected = new Map([
    ["qkit,table,orders", "1"],
    ["qkit,grant,orders:anon", "2"],
  ]);

  it("finds no drift in identical fingerprints", () => {
    expect(compareFingerprints(expected, new Map(expected))).toEqual({
      missing: [],
      extra: [],
      changed: [],
      known: [],
    });
  });

  it("reports a changed md5, an extra object and a missing grant", () => {
    const actual = new Map([
      ["qkit,table,orders", "changed"],
      ["stockkit,table,product_components", "9"],
    ]);
    expect(compareFingerprints(expected, actual)).toEqual({
      missing: ["qkit,grant,orders:anon"],
      extra: ["stockkit,table,product_components"],
      changed: ["qkit,table,orders"],
      known: [],
    });
  });

  it("moves listed known drift out of the failing buckets", () => {
    const actual = new Map([
      ...expected,
      ["stockkit,table,product_components", "9"],
    ]);
    const result = compareFingerprints(
      expected,
      actual,
      new Set(["stockkit,table,product_components"]),
    );
    expect(result.extra).toEqual([]);
    expect(result.known).toEqual(["stockkit,table,product_components"]);
  });

  it("matches a known entry ending in * as a prefix", () => {
    const actual = new Map([
      ...expected,
      ["stockkit,column,product_components.id", "9"],
      ["stockkit,column,products.id", "9"],
    ]);
    const result = compareFingerprints(
      expected,
      actual,
      new Set(["stockkit,column,product_components.*"]),
    );
    expect(result.known).toEqual(["stockkit,column,product_components.id"]);
    expect(result.extra).toEqual(["stockkit,column,products.id"]);
  });
});

describe("readFingerprint", () => {
  it("rejects a CSV without the fingerprint columns", () => {
    expect(() => readFingerprint("a,b\n1,2\n")).toThrow(/schema/);
  });
});

describe("main", () => {
  it("exits 0 for identical fingerprints", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(main([fixture("expected.csv"), fixture("identical.csv")])).toBe(0);
  });

  it("exits 1 and lists each drifted object", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(main([fixture("expected.csv"), fixture("drifted.csv")])).toBe(1);
    const report = String(log.mock.calls[0]?.[0]);
    expect(report).toContain(
      "qkit,function,place_order(p_booth uuid, p_items jsonb)",
    );
    expect(report).toContain(
      "qkit,routine_grant,place_order(p_booth uuid, p_items jsonb):anon",
    );
    expect(report).toContain("stockkit,table,product_components");
  });

  it("ignores known drift given with --known", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const exit = main([
      fixture("expected.csv"),
      fixture("drifted.csv"),
      "--known",
      fixture("known.txt"),
    ]);
    expect(exit).toBe(1);
    const report = String(log.mock.calls[0]?.[0]);
    expect(report).toContain("Known drift (ignored) (1):");
    expect(report).toContain("2 object(s) drifted.");
  });

  it("prints usage and exits 2 without two files", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(main([fixture("expected.csv")])).toBe(2);
  });
});
