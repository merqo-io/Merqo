export default function ProfileLoading() {
  return (
    <div
      className="mx-auto max-w-lg space-y-8 px-5 py-7 md:max-w-4xl"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
      <header aria-hidden>
        <div className="h-4 w-24 animate-pulse motion-reduce:animate-none rounded bg-muted" />
        <div className="mt-4 h-3 w-28 animate-pulse motion-reduce:animate-none rounded bg-muted" />
        <div className="mt-2 h-9 w-40 animate-pulse motion-reduce:animate-none rounded-md bg-muted" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse motion-reduce:animate-none rounded bg-muted" />
      </header>
      <div className="space-y-4" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="h-5 w-32 animate-pulse motion-reduce:animate-none rounded bg-muted" />
            <div className="mt-4 h-10 w-full animate-pulse motion-reduce:animate-none rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
