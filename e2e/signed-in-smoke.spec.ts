import { test, expect } from "@playwright/test";
import { TEAM_STATE } from "./global-setup";

// Needs the seeded team member and a live local Supabase (CI's e2e-admin job).
test.describe("signed-in render smoke", () => {
  // Intentional, conditional skip: no seeded auth outside the e2e-admin job.
  test.skip(
    process.env.MERQO_E2E_AUTH !== "1",
    "needs seeded auth (set MERQO_E2E_AUTH=1)",
  );
  test.use({ storageState: TEAM_STATE });

  test("every dashboard and admin page renders", async ({ page }) => {
    const addable =
      process.env.MERQO_E2E_ADDABLE_EMAIL ?? "e2e-addable@merqo.test";
    // Dynamic: Playwright loads specs as CJS and the helper is ESM-only.
    const { renderSmoke } = await import("@merqo/ui/testing");
    const failures = await renderSmoke(page, [
      "/dashboard",
      "/profile",
      "/admin",
      "/admin/vendors",
      `/admin/vendors/${encodeURIComponent(addable)}`,
      "/admin/products",
      "/admin/health",
      "/admin/team",
      "/admin/feedback",
      "/admin/activity",
    ]);

    expect(failures).toEqual([]);
  });

  test("a password-only session is sent to /mfa, not the console", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto("/login");
    await page
      .getByPlaceholder("you@business.sg")
      .fill(process.env.MERQO_E2E_TEAM_EMAIL ?? "e2e-team@merqo.test");
    await page
      .locator('input[type="password"]')
      .fill(process.env.MERQO_E2E_TEAM_PASSWORD ?? "e2e-test-pass-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/admin/team");
    await expect(page).toHaveURL(/\/mfa/);
    await context.close();
  });
});
