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
    <div className="mx-auto max-w-4xl animate-pulse space-y-8">
      <div className="h-4 w-32 rounded bg-zinc-100" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-zinc-100 lg:aspect-auto lg:min-h-[320px]" />
        <div className="space-y-4">
          <div className="h-8 w-full rounded bg-zinc-100" />
          <div className="h-10 w-40 rounded bg-zinc-100" />
          <div className="h-24 w-full rounded-xl bg-zinc-50" />
        </div>
      </div>
    </div>
  );
}
