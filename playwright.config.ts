import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  },
  webServer: {
    // CI tests the production build: dev has a different CSP and inline scripts.
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
