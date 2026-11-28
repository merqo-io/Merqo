/* eslint-disable sonarjs/no-os-command-from-path -- developer-run tool that needs ffmpeg, ffprobe, psql and docker from PATH */
// Generic demo recorder harness: cursor overlay, pacing, captioned steps,
// off-camera cuts, price masking and the run loop. Kit flows live in record.mjs
// and kit constants in brand.mjs, so this file stays identical across kits.

import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { localDemoBaseUrl, localDemoDbUrl } from "./base-url.mjs";
import { formatSceneList, parseArgs, resolveScene } from "./scenes.mjs";
import { BRAND } from "./brand.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out");

const PHONE = { width: 390, height: 844 };
const CURSOR_SCRIPT = `
  (() => {
    const add = () => {
      if (document.getElementById('__demo_cursor')) return;
      const c = document.createElement('div');
      c.id = '__demo_cursor';
      Object.assign(c.style, {
        position: 'fixed', left: '0', top: '0', zIndex: '2147483647',
        width: '20px', height: '20px', marginLeft: '-10px', marginTop: '-10px',
        borderRadius: '50%', background: 'rgba(30,30,30,0.30)',
        border: '2px solid rgba(255,255,255,0.95)',
        boxShadow: '0 1px 5px rgba(0,0,0,0.45)', pointerEvents: 'none',
        transition: 'width .08s ease, height .08s ease',
      });
      document.body.appendChild(c);
      window.addEventListener('mousemove', (e) => {
        c.style.left = e.clientX + 'px';
        c.style.top = e.clientY + 'px';
      }, { passive: true });
      window.addEventListener('mousedown', () => { c.style.width = '13px'; c.style.height = '13px'; });
      window.addEventListener('mouseup', () => { c.style.width = '20px'; c.style.height = '20px'; });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
    else add();
  })();
`;

// Global tempo. Below 1 is faster: every cosmetic wait and the typing cadence
// scale by it, while real waits (waitForURL, waitFor) are unaffected, so it
// stays robust. Override with DEMO_SPEED.
const SPEED = Number(process.env.DEMO_SPEED ?? 0.75);

// Pages that do unrecorded setup work: no cosmetic waits, no cursor glide, no
// per-character typing, so a scene's prerequisites cost seconds, not a minute.
const FAST = new WeakSet();

const state = {
  steps: [],
  videos: [],
  popMs: 0,
  cuts: [],
  t0: 0,
  mode: "",
  baseUrl: "",
  maskPrices: false,
};
const now = () => Date.now() - state.t0;
const beat = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));
const pause = (page, ms) => (FAST.has(page) ? Promise.resolve() : beat(ms));

/** The moment the order lands: compose drops the chime here. */
function markPop() {
  state.popMs = now();
}

/**
 * Run `fn` off camera: finishRecording trims the frames it spans out of the
 * webm and shifts every later timestamp, so a route's loading skeleton never
 * reaches the clip. Single-video scenes only.
 */
async function offCamera(fn) {
  const startMs = now() + 60;
  await fn();
  state.cuts.push({ startMs, endMs: now() });
}

// The webm starts about half a second after the scene clock, so a cut's
// leading edge lands late and leaves the page's first loading frames in the
// file. A readyMs this far past the cut makes compose drop them.
const RECORDING_LAG_MS = 500;

/** No route loading skeleton on screen. */
const settled = (page) =>
  page.getByRole("status", { name: "Loading" }).waitFor({ state: "hidden" });

const shiftMs = (ms) =>
  state.cuts.reduce(
    (t, c) => t - Math.max(0, Math.min(ms, c.endMs) - c.startMs),
    ms,
  );

/** Drops the cut ranges and returns the trimmed file's path. mp4, because libvpx stalls on this filter. */
function trimCuts(file, startMs) {
  const drop = state.cuts
    .map(
      (c) =>
        `between(t,${((c.startMs - startMs) / 1000).toFixed(3)},${((c.endMs - startMs) / 1000).toFixed(3)})`,
    )
    .join("+");
  const out = file.replace(/\.webm$/, ".mp4");
  const res = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      file,
      "-vf",
      `select='not(${drop})',setpts=N/25/TB`,
      "-r",
      "25",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "12",
      "-pix_fmt",
      "yuv420p",
      "-an",
      out,
    ],
    { stdio: "ignore", timeout: 180000 },
  );
  if (res.status !== 0) throw new Error("ffmpeg could not trim the cuts.");
  fs.rmSync(file);
  return out;
}

/** Wrap a narrative beat: records {caption, startMs, endMs} for compose.mjs. */
async function step(caption, fn) {
  const startMs = now();
  await fn();
  state.steps.push({ caption, startMs, endMs: now() });
}

/** Glide the cursor to an element's centre, then click it (visible motion). */
async function glideClick(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  if (!FAST.has(page)) {
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
        steps: 18,
      });
      await beat(180);
    }
  }
  await locator.click();
}

/** Click a field, then type it character by character for a human cadence. */
async function slowType(page, locator, text, perCharMs = 55) {
  if (FAST.has(page)) {
    await locator.fill(text);
    return;
  }
  await glideClick(page, locator);
  await locator.pressSequentially(text, { delay: perCharMs * SPEED });
  await beat(220);
}

/** Smooth-scroll a target to the vertical centre of the viewport so the action
 *  is the focus instead of stuck at the screen edge. */
async function center(page, locator) {
  if (FAST.has(page)) {
    await locator.scrollIntoViewIfNeeded();
    return;
  }
  await locator
    .evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "smooth" }),
    )
    .catch(() => {});
  await beat(280);
}

/** Smooth-scroll the page by a distance, for the read-only scenes. */
async function scrollPage(page, px) {
  await page.evaluate(
    (y) => window.scrollBy({ top: y, behavior: "smooth" }),
    px,
  );
  await beat(900);
}

// Browser plumbing ---------------------------------------------------------

function newPageDefaults(page) {
  // Turbopack dev keeps an HMR socket open, so "load"/"networkidle" can hang;
  // navigations use domcontentloaded. Be generous on first-compile waits.
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(45000);
}

// Blurs what a free-pilot clip must not show: the local origin (not live
// anywhere) always, prices when the scene asks for it. Text nodes are blurred
// through their parent, and price inputs by placeholder (BRAND.priceInputPlaceholder).
// A MutationObserver runs before paint so no unmasked frame is recorded.
const maskScript = (prices) => `
(() => {
  const origin = /localhost|127[.]0[.]0[.]1/;
  const hit = ${prices ? "/localhost|127[.]0[.]0[.]1|[$] ?[0-9]/" : "origin"};
  const blur = (el) => {
    if (el && el.style.filter !== "blur(7px)") el.style.filter = "blur(7px)";
  };
  const sweep = () => {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (hit.test(n.nodeValue)) blur(n.parentElement);
    }
    for (const el of document.querySelectorAll("input")) {
      if (origin.test(el.value)) blur(el);
      if (${prices} && el.placeholder === ${JSON.stringify(BRAND.priceInputPlaceholder)}) blur(el);
    }
  };
  new MutationObserver(sweep).observe(document, { childList: true, subtree: true, characterData: true });
  setInterval(sweep, 40);
})();
`;

// Transparent rather than display:none so waits on toast text still resolve.
// An adopted stylesheet, because the app's CSP blocks injected <style> tags.
const HIDE_TOASTS_SCRIPT = `
const sheet = new CSSStyleSheet();
sheet.replaceSync("[data-sonner-toaster], [data-sonner-toast] { opacity: 0 !important; pointer-events: none !important; }");
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
`;

/** A recorded context. startMs is when its video begins on the scene clock. */
async function openRecorded(browser, sceneDir, role, opts = {}) {
  const viewport = opts.viewport ?? PHONE;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    storageState: opts.storageState,
    recordVideo: { dir: sceneDir, size: viewport },
  });
  await context.addInitScript(CURSOR_SCRIPT);
  if (BRAND.hideOffCameraScript) {
    await context.addInitScript(BRAND.hideOffCameraScript);
  }
  await context.addInitScript(maskScript(state.maskPrices));
  if (opts.hideToasts) await context.addInitScript(HIDE_TOASTS_SCRIPT);
  // The scene clock starts at the first recorded context, so unrecorded setup
  // never shows up as blank lead-in; later contexts get a positive offset.
  if (state.videos.length === 0) state.t0 = Date.now();
  const page = await context.newPage();
  const startMs = now();
  newPageDefaults(page);
  state.videos.push({ role, context, page, startMs, viewport });
  return page;
}

/** An unrecorded context for setup and for the "other person" in a scene. */
async function openFast(browser, storageState) {
  const context = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 1,
    storageState,
  });
  const page = await context.newPage();
  newPageDefaults(page);
  FAST.add(page);
  return { context, page };
}
/**
 * Run a SQL file against the loopback Postgres. Windows has no host psql, so
 * it falls back to the db container's own, which ignores the url for the
 * connection but still needs it set as the loopback guard.
 */
function runDemoSql(file) {
  const dbUrl = localDemoDbUrl(process.env.DEMO_DB_URL);
  const base = ["-v", "ON_ERROR_STOP=1"];
  const sqlPath = path.join(HERE, file);
  let res = spawnSync("psql", [dbUrl, ...base, "-f", sqlPath], {
    stdio: "inherit",
  });
  if (res.error?.code === "ENOENT") {
    res = spawnSync(
      "docker",
      [
        "exec",
        "-i",
        process.env.DEMO_DB_CONTAINER ?? BRAND.dbContainer,
        "psql",
        "-U",
        "postgres",
        ...base,
      ],
      {
        input: fs.readFileSync(sqlPath),
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
  }
  if (res.status !== 0) throw new Error(`psql failed running ${file}`);
}
/** Close the recorded contexts and name each webm after its role. */
async function finishRecording(dir) {
  const out = [];
  if (state.cuts.length && state.videos.length !== 1)
    throw new Error("Off-camera cuts need a single-video scene.");
  for (const v of state.videos) {
    await v.context.close();
    const tmp = await v.page.video().path();
    let file = `${v.role}.webm`;
    fs.renameSync(tmp, path.join(dir, file));
    if (state.cuts.length) {
      file = path.basename(trimCuts(path.join(dir, file), v.startMs));
    }
    out.push({
      role: v.role,
      file,
      startMs: v.startMs,
      readyMs: state.cuts.length ? shiftMs(v.readyMs) : v.readyMs,
      viewport: v.viewport,
    });
  }
  return out;
}

function cleanSceneDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * CLI entry shared by every kit: parse args, pick the scene's runner, record,
 * write steps.json for compose.mjs. `runners` maps scene name to an async
 * ({browser, scene, dir}) function.
 */
export async function runCli(runners) {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) throw new Error(args.error);
  if (args.list || args.help) {
    console.log(
      `Usage: record.mjs [--scene <name>] [--list]\n${formatSceneList()}`,
    );
    return;
  }
  const scene = resolveScene(args.scene);
  if (scene instanceof Error) throw scene;
  const run = runners[scene.name];
  if (!run) throw new Error(`No recorder for scene "${scene.name}"`);

  state.baseUrl = localDemoBaseUrl(process.env.DEMO_BASE_URL);
  localDemoDbUrl(process.env.DEMO_DB_URL);

  const dir = path.join(OUT, scene.name);
  cleanSceneDir(dir);

  // Headed by default (crisp cursor + real rendering); DEMO_HEADLESS=1 runs it
  // headless for validation. recordVideo captures either way.
  const browser = await chromium.launch({
    headless: process.env.DEMO_HEADLESS === "1",
    channel: process.env.DEMO_BROWSER_CHANNEL || undefined,
  });
  try {
    state.mode = scene.mode;
    state.maskPrices = scene.maskPrices === true;
    await run({ browser, scene, dir });
    const videos = await finishRecording(dir);
    fs.writeFileSync(
      path.join(dir, "steps.json"),
      JSON.stringify(
        {
          scene: scene.name,
          mode: scene.mode,
          hook: scene.hook,
          endLine: scene.endLine ?? null,
          popMs: scene.chime === false ? null : shiftMs(state.popMs),
          videos,
          steps: state.steps.map((st) => ({
            ...st,
            startMs: shiftMs(st.startMs),
            endMs: shiftMs(st.endMs),
          })),
        },
        null,
        2,
      ),
    );
    console.log(`\n✓ Recorded ${videos.map((v) => v.file).join(", ")}`);
    console.log(`✓ ${state.steps.length} captioned beats, steps.json`);
    console.log(`Next: pnpm demo:compose -- --scene ${scene.name}\n`);
  } catch (err) {
    for (const [i, context] of browser.contexts().entries()) {
      for (const [j, page] of context.pages().entries()) {
        const shot = path.join(dir, `failure-${i}-${j}.png`);
        await page.screenshot({ path: shot }).catch(() => {});
        console.error(`Failure screenshot: ${page.url()} -> ${shot}`);
      }
    }
    throw err;
  } finally {
    await browser.close();
  }
}

export {
  FAST,
  PHONE,
  RECORDING_LAG_MS,
  beat,
  center,
  glideClick,
  markPop,
  now,
  offCamera,
  openFast,
  openRecorded,
  pause,
  runDemoSql,
  scrollPage,
  settled,
  slowType,
  state,
  step,
};
