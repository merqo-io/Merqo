export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8" role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-8 w-40 animate-pulse motion-reduce:animate-none rounded bg-muted" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse motion-reduce:animate-none rounded-xl bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
