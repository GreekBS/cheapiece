export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-zinc-200" />
        <div className="h-4 w-full max-w-lg rounded-md bg-zinc-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-zinc-100 bg-white shadow-sm">
            <div className="h-full rounded-xl bg-zinc-50/80" />
          </div>
        ))}
      </div>
      <div className="h-48 rounded-xl border border-zinc-100 bg-white shadow-sm">
        <div className="h-full rounded-xl bg-zinc-50/80" />
      </div>
    </div>
  );
}

export function OffersTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex justify-between gap-4">
        <div className="h-8 w-40 rounded-md bg-zinc-200" />
        <div className="h-10 w-32 rounded-lg bg-zinc-200" />
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm">
        <div className="h-10 border-b border-zinc-100 bg-zinc-50" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 border-b border-zinc-50 px-4 py-4">
            <div className="h-4 flex-1 rounded bg-zinc-100" />
            <div className="h-4 w-16 rounded bg-zinc-100" />
            <div className="h-4 w-20 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-xl animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-md bg-zinc-200" />
      <div className="space-y-4 rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 rounded bg-zinc-200" />
            <div className="h-10 w-full rounded-lg bg-zinc-100" />
          </div>
        ))}
        <div className="h-10 w-32 rounded-lg bg-zinc-200" />
      </div>
    </div>
  );
}
