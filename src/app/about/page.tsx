import Link from "next/link";
import { AboutMerqo } from "@merqo/ui";
import { getLandingNavUser } from "@/lib/landing-nav-user";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { Button } from "@merqo/ui/primitives";
import { createServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "About",
};

export default async function AboutPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Nav user={await getLandingNavUser(user)} />
      <main className="flex-1">
        <AboutMerqo>
          <Button asChild size="lg">
            <Link href="/#kits">See the kits</Link>
          </Button>
        </AboutMerqo>
      </main>
      <Footer />
    </>
  );
}
