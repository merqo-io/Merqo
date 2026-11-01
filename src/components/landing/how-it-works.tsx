const STEPS = [
  {
    title: "Pick a kit",
    body: "qkit is piloting with a few vendors, for booth ordering and queues. loopkit, paykit, and stockkit are in build.",
  },
  {
    title: "Sign up once",
    body: "One Merqo sign-in works across every kit.",
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
      <div className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="rounded-2xl border p-6">
            <p className="font-mono text-xs text-muted-foreground">
              Step {i + 1}
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
