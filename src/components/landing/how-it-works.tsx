const STEPS = [
  {
    title: "Pick a kit",
    body: "qkit is piloting, for booth ordering and queues. loopkit, paykit, stockkit and printkit are in build.",
  },
  {
    title: "Pick your kits",
    body: "Start with the kit you need. Add another only when you want it.",
  },
  {
    title: "Run your stall",
    body: "Each kit runs on its own day to day. Merqo's dashboard is where you manage them.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-10 text-center text-3xl font-display font-bold tracking-tight">
        How Merqo works
      </h2>
      <ol className="mx-auto max-w-2xl border-l">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative pb-8 pl-8 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-3 top-0 grid size-6 place-items-center rounded-full border bg-background font-mono text-xs tabular-nums"
            >
              {i + 1}
            </span>
            <h3 className="font-display text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
