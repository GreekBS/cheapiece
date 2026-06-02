export function MerchantOnboardingSkeleton() {
  return (
    <div className="mx-auto max-w-lg animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-2/3 rounded-lg bg-zinc-200" />
        <div className="h-4 w-full rounded bg-zinc-100" />
      </div>
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="h-10 w-full rounded-lg bg-zinc-100" />
        <div className="h-10 w-full rounded-lg bg-zinc-100" />
        <div className="h-11 w-40 rounded-lg bg-zinc-200" />
      </div>
    </div>
  );
}
