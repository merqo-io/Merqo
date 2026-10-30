import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const QUOTE = '"';

function readQuoted(text, start) {
  let value = "";
  let i = start + 1;
  for (;;) {
    const close = text.indexOf(QUOTE, i);
    if (close < 0) return [value + text.slice(i), text.length];
    value += text.slice(i, close);
    if (text[close + 1] !== QUOTE) return [value, close + 1];
    value += QUOTE;
    i = close + 2;
  }
}

function readField(text, start) {
  if (text[start] === QUOTE) return readQuoted(text, start);
  let i = start;
  while (i < text.length && !",\r\n".includes(text[i])) i += 1;
  return [text.slice(start, i), i];
}

/** Parses RFC 4180 CSV (quoted fields, doubled quotes, CRLF or LF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let i = 0;
  while (i <= text.length) {
    const [value, end] = readField(text, i);
    row.push(value);
    const separator = text[end];
    i = end + 1;
    if (separator === ",") continue;
    if (separator === "\r" && text[i] === "\n") i += 1;
    if (row.some((field) => field !== "")) rows.push(row);
    row = [];
  }
  return rows;
}

const objectKey = (schema, kind, name) => `${schema},${kind},${name}`;

/** Maps "schema,kind,name" to md5, from fingerprint CSV with a header row. */
export function readFingerprint(text) {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const columns = header?.map((column) => column.trim().toLowerCase()) ?? [];
  const at = (name) => {
    const index = columns.indexOf(name);
    if (index < 0) throw new Error(`fingerprint CSV has no "${name}" column`);
    return index;
  };
  const [schema, kind, name, md5] = ["schema", "kind", "name", "md5"].map(at);
  return new Map(
    rows.map((row) => [objectKey(row[schema], row[kind], row[name]), row[md5]]),
  );
}

/** Known drift: one "schema,kind,name" per line, a trailing * matches a prefix; # starts a comment. */
export function readKnown(text) {
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*/, "").trim())
      .filter(Boolean),
  );
}

const isKnown = (known, key) =>
  [...known].some((entry) =>
    entry.endsWith("*") ? key.startsWith(entry.slice(0, -1)) : entry === key,
  );

export function compareFingerprints(expected, actual, known = new Set()) {
  const result = { missing: [], extra: [], changed: [], known: [] };
  const sort = (keys) => keys.sort((a, b) => a.localeCompare(b));
  const file = (bucket, key) =>
    (isKnown(known, key) ? result.known : result[bucket]).push(key);
  for (const [key, md5] of expected) {
    if (!actual.has(key)) file("missing", key);
    else if (actual.get(key) !== md5) file("changed", key);
  }
  for (const key of actual.keys()) if (!expected.has(key)) file("extra", key);
  for (const keys of Object.values(result)) sort(keys);
  return result;
}

const driftCount = (result) =>
  result.missing.length + result.extra.length + result.changed.length;

export function formatReport(result) {
  const lines = [];
  const section = (title, keys) => {
    if (keys.length === 0) return;
    lines.push(`${title} (${keys.length}):`, ...keys.map((key) => `  ${key}`));
  };
  section(
    "Missing from the database (in the repo migrations only)",
    result.missing,
  );
  section("Extra in the database (in no repo migration)", result.extra);
  section("Changed definition", result.changed);
  section("Known drift (ignored)", result.known);
  const drift = driftCount(result);
  lines.push(drift === 0 ? "No drift." : `${drift} object(s) drifted.`);
  return lines.join("\n");
}

export function main(argv) {
  const args = [...argv];
  const knownIndex = args.indexOf("--known");
  let known = new Set();
  if (knownIndex >= 0) {
    known = readKnown(readFileSync(args[knownIndex + 1], "utf8"));
    args.splice(knownIndex, 2);
  }
  if (args.length !== 2) {
    console.error(
      "usage: node scripts/drift-compare.mjs <expected.csv> <actual.csv> [--known <file>]",
    );
    return 2;
  }
  const [expected, actual] = args.map((file) =>
    readFingerprint(readFileSync(file, "utf8")),
  );
  const result = compareFingerprints(expected, actual, known);
  console.log(formatReport(result));
  return driftCount(result) === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = main(process.argv.slice(2));
}
