import Link from "next/link";
import { Button } from "@merqo/ui/primitives";
import { ArrowRight } from "lucide-react";
import { KitSwitcher } from "./kit-switcher";

export function Hero({ authed = false }: { authed?: boolean }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Merqo · small-business toolkit
        </p>
        <h1 className="mt-4 max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl">
          Simple tools to run your small business.
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted-foreground">
          Merqo builds a family of no-fuss tools for Singapore&rsquo;s small
          sellers: hawkers, home businesses, and event-day pop-ups. qkit is in
          pilot for orders and queues, and the rest of the family is in build.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href={authed ? "/post-login" : "/login"}>
              {authed ? "Go to dashboard" : "Get started"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="min-h-11">
            <a href="#kits">See the kits</a>
          </Button>
        </div>
      </div>
      <div className="flex justify-center lg:justify-end">
        <KitSwitcher />
      </div>
    </section>
  );
}
