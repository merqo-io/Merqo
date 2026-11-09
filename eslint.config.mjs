import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import { merqoEslintPreset, merqoNoLocalCopies } from "@merqo/ui/eslint";

// One shared plugin reference: mixing sonarjs.configs.recommended with a
// separate `plugins: { sonarjs }` block in another config object throws
// "Cannot redefine plugin sonarjs" — every block below reuses this instead.
const sonarjsPlugin = sonarjs.configs.recommended.plugins.sonarjs;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "sonarjs/no-unused-vars": "off",
    },
  },
  {
    ...sonarjs.configs.recommended,
    rules: { ...sonarjs.configs.recommended.rules },
  },
  {
    // shadcn/ui primitives are generated, not hand-edited — prefer-read-only-props
    // fires on their prop typing and can't be fixed without diverging from `shadcn add` output.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    plugins: { sonarjs: sonarjsPlugin },
    rules: { "sonarjs/prefer-read-only-props": "off" },
  },
  ...merqoEslintPreset({
    sonarjsPlugin,
    tsPlugin: nextTs.find((c) => c.plugins?.["@typescript-eslint"]).plugins[
      "@typescript-eslint"
    ],
  }),
  // supabase-*, rate-limit: thin wrappers that bind merqo's env, schema, cookie
  // domain and RPC counter store to the shared helpers, so importers keep one
  // call without repeating that config.
  // dashboard-nav, dashboard-tour: wrappers that pass merqo's nav, feedback,
  // support and tour content into the shared components.
  // use-async-action: adapter that keeps the per-call closure shape of seven
  // call sites over the shared hook, which binds its action at creation.
  // components/ui/badge: kept on purpose for the gold and soft destructive
  // variants the shared badge lacks.
  ...merqoNoLocalCopies({
    allow: [
      "supabase-client",
      "supabase-server",
      "supabase-middleware",
      "rate-limit",
      "dashboard-nav",
      "dashboard-tour",
      "use-async-action",
      "components/ui/badge",
    ],
  }),
  {
    // The service client bypasses RLS: keep it in lib helpers and bearer-gated
    // route handlers. A Server Action that needs it states why on the import.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/**", "src/app/api/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/server",
              importNames: ["createServiceClient"],
              message:
                "Service-role client bypasses RLS. Use it only in src/lib or src/app/api, or justify with an eslint-disable description.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Enforcement-layer scripts, not app code — integrity is hash-checked via
    // .claude/harness.json, not style-checked here (mirrors .husky/pre-commit's
    // format-lint exclude for the same directory).
    ".claude/hooks/**",
    // Agent worktrees are independent checkouts (their own node_modules,
    // .next, etc.) — not app code, and .gitignore's mismatch (see that file)
    // meant they were never actually excluded before.
    ".claude/worktrees/**",
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
