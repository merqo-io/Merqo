import Link from "next/link";
import { LandingNav } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { Wordmark } from "@/components/brand/wordmark";
import { getAvatarUrl, getDisplayName } from "@/lib/account";
import { LandingAccountMenu } from "./account-menu";

export type NavAccount = { name: string; avatarUrl?: string };

/** Name and avatar from the auth user alone, so public pages need no profile query. */
export function navAccount(
  user: { email?: string; user_metadata?: unknown } | null,
): NavAccount | undefined {
  if (!user) return undefined;
  return {
    name: getDisplayName(user) || user.email || "Account",
    avatarUrl: getAvatarUrl(user) ?? undefined,
  };
}

export function Nav({
  authed = false,
  account,
}: {
  authed?: boolean;
  account?: NavAccount;
}) {
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
            className="rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
            className="rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            FAQ
          </Link>
          {authed ? (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/post-login">Dashboard</Link>
              </Button>
              <LandingAccountMenu
                name={account?.name || "Account"}
                avatarUrl={account?.avatarUrl}
              />
            </>
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
