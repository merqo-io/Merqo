import { AcceptTermsForm, AuthShell, safeRedirectPath } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { signOutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { acceptLegalTerms } from "./actions";

export const revalidate = 0;

// Deliberately does NOT call requireVendorSession (or any other legal-gate
// check) — this page is what that gate redirects TO. Gating it the same way
// would be an infinite redirect loop. acceptLegalTerms (actions.ts) re-checks
// for a signed-in user on submit and sends a signed-out visitor to /login.
export default async function LegalAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      wordmark={<Wordmark className="text-2xl" />}
      title="Our terms have been updated"
      subtitle="Please review and accept before continuing."
    >
      <div className="space-y-4">
        <AcceptTermsForm
          action={acceptLegalTerms}
          next={safeRedirectPath(next, "/dashboard")}
        />
        {/* Separate form: nesting forms is invalid HTML. */}
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="h-11 w-full">
            Sign out
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
