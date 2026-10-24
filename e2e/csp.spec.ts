import { test, expect, type Page } from "@playwright/test";

function watchCsp(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) {
      problems.push(m.text());
    }
  });
  page.on("pageerror", (e) => problems.push(e.message));
  return problems;
}

test("a dynamic page runs scripts under a nonce CSP", async ({ page }) => {
  const problems = watchCsp(page);
  const response = await page.goto("/login");
  const csp = response?.headers()["content-security-policy"] ?? "";

  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  const nonced = await page.locator("script[nonce]").count();
  expect(nonced).toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect(problems).toEqual([]);
});

test("a static page keeps the static CSP and still runs", async ({ page }) => {
  const problems = watchCsp(page);
  const response = await page.goto("/");

  expect(response?.headers()["content-security-policy"]).toMatch(
    /script-src 'self' 'unsafe-inline'/,
  );
  await expect(
    page.getByRole("button", { name: "Stack all" }).first(),
  ).toBeVisible();
  expect(problems).toEqual([]);
});
