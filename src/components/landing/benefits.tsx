const BENEFITS = [
  {
    title: "One brand, many tools",
    body: "Merqo is a growing kit of small-business tools. Pick the ones you need.",
  },
  {
    title: "Each kit runs on its own",
    body: "Use only the kits you need. None depends on another.",
  },
  {
    title: "Built for SG micro-sellers",
    body: "Made for home kitchens, pop-ups, and new cafes. Plain language and PayNow-friendly.",
  },
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <dl className="divide-y border-y">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="grid gap-2 py-5 sm:grid-cols-[2fr_3fr] sm:gap-10"
          >
            <dt className="font-display text-lg font-bold">{b.title}</dt>
            <dd className="text-sm leading-6 text-muted-foreground">
              {b.body}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
