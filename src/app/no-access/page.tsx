import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { AuthShell } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";

export const revalidate = 0;

// Shown to a signed-in user who is not on the Merqo team. requireMerqoTeam
// redirects here instead of 404ing, so the person knows access is the issue.
export default async function NoAccessPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell
      align="center"
      wordmark={<Wordmark className="text-2xl" />}
      title={<>You&rsquo;re not on the team yet</>}
      subtitle={
        user?.email ? (
          <>
            You&rsquo;re signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>,
            but this account isn&rsquo;t on the Merqo team. Ask an admin to add
            you, then reload.
          </>
        ) : (
          <>Sign in with a Merqo-team account to continue.</>
        )
      }
    >
      <div className="flex flex-col gap-2.5">
        {user && (
          <Button asChild className="h-11 w-full rounded-xl">
            <Link href="/admin">Check again</Link>
          </Button>
        )}
        {user ? (
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="outline"
              className="h-11 w-full rounded-xl"
            >
              Sign out
            </Button>
          </form>
        ) : (
          <Button asChild className="h-11 w-full rounded-xl">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="h-11 w-full rounded-xl">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
