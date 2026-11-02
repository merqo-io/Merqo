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
        <div className="mt-8">
          <WaitlistForm kits={kits} initialSlug={initialSlug} />
        </div>
      </main>
      <Footer />
    </>
  );
}
