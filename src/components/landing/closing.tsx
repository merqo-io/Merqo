import Link from "next/link";
import { ClosingCall } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { PRICING_LINE } from "@/lib/kits";

export function Closing({ authed = false }: { authed?: boolean }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <ClosingCall
        heading="Run your stall with Merqo."
        line={PRICING_LINE}
        aside={
          <p className="text-lg leading-[1.55]">
            qkit is piloting. The other kits are in build, not yet tried with
            vendors.
          </p>
        }
        action={
          <Button asChild size="lg" className="min-h-11">
            <Link href={authed ? "/post-login" : "/login"}>
              {authed ? "Go to dashboard" : "Sign in"}
            </Link>
          </Button>
        }
      />
    </section>
  );
}
