import Link from "next/link";
import { Badge, Button, Card, CardContent } from "@merqo/ui/primitives";
import { getLandingNavUser } from "@/lib/landing-nav-user";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { createServerClient } from "@/lib/supabase/server";
import {
  FOUNDER_SPOTS_NOTE,
  ORGANISER_CONTACT_HREF,
  PAID_TERMS,
  PAID_TERMS_HEADING,
  PLAN_COVERS,
  PLAN_ROWS,
  WHICH_PLAN_INTRO,
  WHICH_PLAN_TITLE,
} from "./which-plan-content";

export const metadata = {
  title: "Which plan fits you",
};

export default async function WhichPlanPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Nav user={await getLandingNavUser(user)} />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {WHICH_PLAN_TITLE}
          </h1>
          <p className="mt-4 max-w-[60ch] text-muted-foreground">
            {WHICH_PLAN_INTRO}
          </p>

          <ul className="mt-10 space-y-4">
            {PLAN_ROWS.map((row) => (
              <li key={row.id}>
                <Card>
                  <CardContent className="space-y-2">
                    <h2 className="font-medium">{row.vendor}</h2>
                    <Badge variant="secondary">{row.plan}</Badge>
                    <p className="text-sm text-muted-foreground">{row.why}</p>
                    {row.id === "organiser" ? (
                      <a
                        href={ORGANISER_CONTACT_HREF}
                        className="text-sm underline underline-offset-4"
                      >
                        Email the team
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-display text-xl font-bold tracking-tight">
            What each plan covers
          </h2>
          <dl className="mt-4 space-y-3">
            {PLAN_COVERS.map((p) => (
              <div key={p.plan}>
                <dt className="font-medium">{p.plan}</dt>
                <dd className="text-sm text-muted-foreground">{p.covers}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-12 font-display text-xl font-bold tracking-tight">
            {PAID_TERMS_HEADING}
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {PAID_TERMS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/waitlist" className="underline underline-offset-4">
              {FOUNDER_SPOTS_NOTE}
            </Link>
          </p>

          <div className="mt-10">
            <Button asChild size="lg">
              {user ? (
                <Link href="/post-login">Dashboard</Link>
              ) : (
                <Link href="/waitlist">Join the waitlist</Link>
              )}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
