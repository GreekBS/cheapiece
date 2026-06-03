export function MarketGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="aspect-[4/3] bg-zinc-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-[75%] rounded bg-zinc-100" />
            <div className="h-3 w-1/2 rounded bg-zinc-50" />
            <div className="h-6 w-24 rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <div className="h-4 w-40 rounded bg-zinc-100" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="aspect-square max-h-[28rem] rounded-2xl bg-zinc-100" />
        <div className="space-y-4 rounded-2xl border border-zinc-100 p-6">
          <div className="h-10 w-32 rounded bg-zinc-100" />
          <div className="h-12 w-full rounded bg-zinc-100" />
          <div className="h-28 w-full rounded-xl bg-zinc-50" />
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-zinc-100 p-6">
        <div className="h-8 w-2/3 rounded bg-zinc-100" />
        <div className="h-4 w-1/3 rounded bg-zinc-50" />
      </div>
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-zinc-100" />
        <div className="h-32 rounded-2xl bg-zinc-100" />
      </div>
    </div>
  );
}
