import { z } from "zod";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { KITS, WAITLISTABLE_SLUGS } from "@/lib/kits";
import { createServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Join the waitlist",
};

const kitParam = z.enum(WAITLISTABLE_SLUGS as [string, ...string[]]);

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ kit?: string | string[] }>;
}) {
  const { kit } = await searchParams;
  // An unknown or missing ?kit= preselects nothing, so the visitor picks.
  const parsed = kitParam.safeParse(Array.isArray(kit) ? kit[0] : kit);
  const initialSlug = parsed.success ? parsed.data : "";

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const kits = KITS.filter((k) => WAITLISTABLE_SLUGS.includes(k.slug)).map(
    (k) => ({ slug: k.slug, name: k.name }),
  );

  return (
    <>
      <Nav authed={!!user} />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Join the waitlist
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          These kits are built but not yet tried with vendors. Pick the one you
          want and leave your email.
        </p>
        <section
          aria-labelledby="founding-offer"
          className="mt-8 rounded-lg border bg-muted/50 p-4"
        >
          <h2
            id="founding-offer"
            className="font-display text-lg font-semibold"
          >
            Founding merchant offer
          </h2>
          <p className="mt-2 text-sm">
            Merqo is free during the pilot. We have 20 founding merchant spots.
            Founding merchants get every kit we release during their first year,
            setup done for them, and a price that never goes up while they stay
            subscribed. Nothing to pay today. We confirm the price with you
            before any charge.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Merqo is a personal software project by Clarence Lee, not registered
            with ACRA or incorporated. If that changes, your founding offer
            carries over.
          </p>
        </section>
        <div className="mt-8">
          <WaitlistForm kits={kits} initialSlug={initialSlug} />
        </div>
      </main>
      <Footer />
    </>
  );
}
