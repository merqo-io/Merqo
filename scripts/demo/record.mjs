// Merqo demo recorder: drives the REAL app against a LOCAL Supabase, records one
// named scene (see scenes.mjs) as vertical phone footage, and writes steps.json
// (caption + timing per beat) for compose.mjs to burn in. The generic harness
// lives in harness.mjs; this file holds only Merqo's flows.
//
// Prereqs: local Supabase up (migrations applied) and a production build
// running (`pnpm build && pnpm start`; dev mode shows StrictMode banners).
// See README.md.
//
// Run: pnpm demo:record -- --scene one-account
// Out: scripts/demo/out/<scene>/{main.mp4, steps.json}
//
// Selectors use roles and visible text. If a beat times out, the app markup
// moved: fix the locator, not the timeout.

import {
  beat,
  center,
  glideClick,
  offCamera,
  openRecorded,
  runCli,
  runDemoSql,
  scrollPage,
  slowType,
  state,
  step,
} from "./harness.mjs";

// Fixed demo identity. Must match scripts/demo/reset.sql and join-kits.sql.
const EMAIL = "demo-vendor@merqo.example";
const PASSWORD = "Demo-Password-123!";

/** Close the dashboard's first-visit tour popover; it would cover the page. */
async function dismissTour(page) {
  const popover = page.locator(".driver-popover");
  try {
    await popover.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return;
  }
  await page.keyboard.press("Escape");
  await popover.waitFor({ state: "hidden" });
}

async function oneAccountScene({ browser, scene, dir }) {
  runDemoSql("reset.sql");
  const page = await openRecorded(browser, dir, "main", { hideToasts: true });
  const toggle = page.getByRole("button", { name: "Create an account" });
  const submit = page.getByRole("button", { name: "Create account" });
  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password", { exact: true });

  await page.goto(`${state.baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await toggle.waitFor();
  // compose drops the recording's blank warm-up up to this mark.
  state.videos[0].readyMs = Date.now() - state.t0;

  await step(scene.captions.signup, async () => {
    await beat(900);
    // A click that lands before hydration does nothing; click again until the
    // form switches to sign-up mode.
    for (let i = 0; i < 5 && !(await submit.isVisible()); i++) {
      await glideClick(page, toggle);
      await beat(500);
    }
    await submit.waitFor();
    await slowType(page, email, EMAIL);
  });

  await step(scene.captions.signin, async () => {
    await slowType(page, password, PASSWORD);
    await beat(500);
    await glideClick(page, submit);
  });

  await offCamera(async () => {
    await page.waitForURL("**/dashboard");
    await dismissTour(page);
    runDemoSql("join-kits.sql");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Your kits" }).waitFor();
  });

  await step(scene.captions.kits, async () => {
    await beat(1200);
    await center(page, page.getByRole("heading", { name: "Your kits" }));
    await scrollPage(page, 260);
    await beat(1400);
  });

  await step(scene.captions.more, async () => {
    const more = page.getByRole("heading", { name: "Complete your toolkit" });
    await center(page, more);
    await beat(2200);
  });
}

const RUNNERS = {
  "one-account": oneAccountScene,
};

runCli(RUNNERS).catch((err) => {
  console.error("\n✗ Recording failed:", err.message);
  process.exit(1);
});
