import { chromium, type FullConfig } from "@playwright/test";
import { totpCode } from "./totp";

export const TEAM_STATE = "e2e/.auth/team.json";

// Signs the seeded team member in once, enrols an authenticator through the
// real /mfa page and saves the aal2 session for every authed test.
export default async function globalSetup(config: FullConfig) {
  if (process.env.MERQO_E2E_AUTH !== "1") return;
  const baseURL = config.projects[0].use.baseURL;
  const email = process.env.MERQO_E2E_TEAM_EMAIL ?? "e2e-team@merqo.test";
  // Fixture default for a throwaway local Supabase test account, not a real credential.
  const password = process.env.MERQO_E2E_TEAM_PASSWORD ?? "e2e-test-pass-123";

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ baseURL })).newPage();
  await page.goto("/login");
  await page.getByPlaceholder("you@business.sg").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(mfa|admin)/);

  await page.goto("/mfa");
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const secret = (await page.locator("code").innerText()).trim();
  await page.getByLabel("6-digit code").fill(totpCode(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/admin/);

  await page.context().storageState({ path: TEAM_STATE });
  await browser.close();
}
