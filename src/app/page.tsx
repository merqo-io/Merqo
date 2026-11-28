import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { KitJourney } from "@/components/landing/kit-journey";
import { Faq } from "@/components/landing/faq";
import { Closing } from "@/components/landing/closing";
import { Footer } from "@/components/landing/footer";
import { BackToTop } from "@merqo/ui";
import { getLandingNavUser } from "@/lib/landing-nav-user";
import { Button } from "@merqo/ui/primitives";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export default async function Home() {
  // Reflect the session in the landing CTAs: a signed-in operator jumps straight
  // to the dashboard instead of being sent back through /login.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  return (
    <>
      <Nav user={await getLandingNavUser(user)} />
      <main className="flex-1">
        <Hero authed={authed} />
        <KitJourney />
        <Faq />
        <Closing authed={authed} />
      </main>
      <Footer />
      <BackToTop />
      {/* Sticky mobile CTA — one persistent action on small screens. */}
      <div className="sticky bottom-0 z-40 border-t bg-background/90 p-3 backdrop-blur sm:hidden">
        <Button asChild size="lg" className="min-h-11 w-full">
          <Link href={authed ? "/post-login" : "/login"}>
            {authed ? "Go to dashboard" : "Sign in"}
          </Link>
        </Button>
      </div>
    </>
  );
}
