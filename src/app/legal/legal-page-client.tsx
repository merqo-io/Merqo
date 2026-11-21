"use client";

import Link from "next/link";
import { LegalPage } from "@merqo/ui";
import { Wordmark } from "@/components/brand/wordmark";

// The package bundle inlines the client-only LegalDocument into LegalPage's
// chunk without "use client", so rendering LegalPage from a Server Component
// fails in production builds. Drop this wrapper once the package keeps the
// client boundary.
export function LegalPageClient({ doc }: { doc: "terms" | "privacy" }) {
  return (
    <LegalPage
      doc={doc}
      wordmark={<Wordmark className="text-2xl" />}
      LinkComponent={Link}
    />
  );
}
