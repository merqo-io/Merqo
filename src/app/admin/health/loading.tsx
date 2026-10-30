export default function HealthLoading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div>
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>
      <section className="mt-6 space-y-2 rounded-xl border bg-card p-4 shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-full animate-pulse rounded bg-muted"
            aria-hidden
          />
        ))}
      </section>
    </main>
  );
}
