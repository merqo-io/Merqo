import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthConfirmForm, AuthConfirmInvalid, AuthShell } from "@merqo/ui";
import { authConfirmForwardUrl, readAuthConfirmParams } from "@merqo/ui/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { KIT_AUTH_ORIGINS } from "@/lib/kits";

export const metadata: Metadata = {
  title: "Confirm your link",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";

  // Only the allowlist decides; selfOrigin just stops a loop back to merqo.
  const forward = authConfirmForwardUrl(query, {
    allowedOrigins: KIT_AUTH_ORIGINS,
    selfOrigin: `${proto}://${host}`,
  });
  if (forward) redirect(forward);

  const params = readAuthConfirmParams(query);
  return (
    <AuthShell
      align="center"
      wordmark={<Wordmark className="text-2xl" />}
      title={params ? "Confirm your email" : "Link problem"}
    >
      {params ? (
        <AuthConfirmForm
          tokenHash={params.tokenHash}
          type={params.type}
          next={params.next}
        />
      ) : (
        <AuthConfirmInvalid />
      )}
    </AuthShell>
  );
}
