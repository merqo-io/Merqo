import Link from "next/link";
import { Footer as SharedFooter } from "@merqo/ui";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * merqo's landing footer: `@merqo/ui`'s shared `Footer` plus this app's own
 * wordmark and strings. merqo is the hub rather than a kit, so it overrides
 * the copyright line and the sign-in label, which otherwise read
 * "a Merqo kit" and "Vendor sign in". The signed-in dashboard and admin
 * shells leave the sign-in link off.
 */
export function Footer({ showSignIn = true }: { showSignIn?: boolean }) {
  return (
    <SharedFooter
      kitName="merqo"
      tagline={"Simple tools for Singapore’s small sellers."}
      copyright="© 2026 Merqo"
      signInLabel="Sign in →"
      showSignIn={showSignIn}
      wordmark={
        <Link
          href="/"
          aria-label="Merqo home"
          className="transition-opacity hover:opacity-80"
        >
          <Wordmark className="text-xl" />
        </Link>
      }
    />
  );
}
