function LineSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-100" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function CartDropdownLoading() {
  return (
    <div aria-busy="true" aria-label="Φόρτωση καλαθιού" className="divide-y divide-slate-100">
      <LineSkeleton />
      <LineSkeleton />
      <LineSkeleton />
    </div>
  );
}
