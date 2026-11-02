import { Boxes, KeyRound, Store } from "lucide-react";

const BENEFITS = [
  {
    icon: Boxes,
    title: "One brand, many tools",
    body: "Merqo is a growing kit of small-business tools. Pick the ones you need.",
  },
  {
    icon: KeyRound,
    title: "One account for the kits you use",
    body: "Sign in once and use the same account on each kit you use.",
  },
  {
    icon: Store,
    title: "Built for SG micro-sellers",
    body: "Made for home kitchens, pop-ups, and new cafes. Plain language and PayNow-friendly.",
  },
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-8 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title}>
            <b.icon className="size-6 text-primary" aria-hidden />
            <h3 className="mt-4 font-display text-lg font-bold">{b.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {b.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
