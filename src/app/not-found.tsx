import Link from "next/link";
import { NotFound } from "@merqo/ui";
import { Wordmark } from "@/components/brand/wordmark";

/** Branded 404: reached e.g. from a stale or mistyped console URL. */
export default function NotFoundPage() {
  return (
    <NotFound
      wordmark={<Wordmark className="text-2xl" />}
      code="404"
      title="Not found"
      description="This page does not exist, or you do not have access to it."
      homeHref="/"
      homeLabel="Back to home"
      LinkComponent={Link}
    />
  );
}
