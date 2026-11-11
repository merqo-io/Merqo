/* eslint-disable no-restricted-syntax -- renders without the app stylesheet, so colours stay literal */
"use client";

import { GlobalError } from "@merqo/ui";

// Next renders this only when the root layout itself throws, so the app
// stylesheet has not loaded: the token values are passed in as literals.
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <GlobalError
      error={error}
      reset={reset}
      colors={{
        background: "#f7f6f3",
        foreground: "#2b2926",
        mutedForeground: "#726d64",
        primary: "#1f6b4f",
        primaryForeground: "#fff",
      }}
      fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      radius="0.625rem"
      description="An unexpected error interrupted the console. Try again. If it keeps happening, refresh the page in a moment."
    />
  );
}
