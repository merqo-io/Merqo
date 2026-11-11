"use client";

import { ErrorPage } from "@merqo/ui";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * Root error boundary: replaces the raw Next error overlay in production if an
 * RSC throws (e.g. Supabase or a kit's metrics API is briefly unreachable).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      error={error}
      reset={reset}
      wordmark={<Wordmark className="text-2xl" />}
      eyebrow="Something went wrong"
      title="That didn't load"
      description="Something went wrong on our side. Try again."
    />
  );
}
