export default function MfaLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div role="status" aria-busy="true" className="w-full max-w-md">
        <span className="sr-only">Loading</span>
        <div
          className="rounded-2xl border bg-card px-7 py-10 shadow-sm"
          aria-hidden
        >
          <div className="h-7 w-28 animate-pulse motion-reduce:animate-none rounded-md bg-muted" />
          <div className="mt-6 h-9 w-56 animate-pulse motion-reduce:animate-none rounded-md bg-muted" />
          <div className="mt-6 space-y-3">
            <div className="h-10 w-full animate-pulse motion-reduce:animate-none rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse motion-reduce:animate-none rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
