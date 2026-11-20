import Link from "next/link";
import { LandingAccountNav, LandingNav, type NavUser } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { Wordmark } from "@/components/brand/wordmark";
import { signOutAction } from "@/app/actions/auth";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { submitLandingSupport } from "@/app/actions/landing-account";
import { SUPPORT_CATEGORY_LABELS } from "@/lib/feedback-support-schemas";

export function Nav({ user = null }: { user?: NavUser | null }) {
  return (
    <LandingNav
      wordmark={
        <Link
          href="/"
          className="rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Wordmark className="text-3xl" />
          <span className="sr-only">Merqo home</span>
        </Link>
      }
      end={
        <>
          <Link
            href="#kits"
            className="hidden sm:inline-flex rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Kits
          </Link>
          <Link
            href="/about"
            className="rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            About
          </Link>
          <Link
            href="/faq"
            className="hidden sm:inline-flex rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            FAQ
          </Link>
          {user ? (
            <LandingAccountNav
              kit="merqo"
              dashboardHref="/post-login"
              user={user}
              signOutAction={signOutAction}
              actions={{
                submitSupport: submitLandingSupport,
                submitFeedback: submitFeedbackAction,
              }}
              supportCategories={SUPPORT_CATEGORY_LABELS}
              LinkComponent={Link}
            />
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </>
      }
    />
  );
}
