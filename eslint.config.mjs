import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import { merqoEslintPreset } from "@merqo/ui/eslint";

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
