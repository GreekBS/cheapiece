import { MarketGridSkeleton } from "@/components/market/MarketSkeleton";

export default function MarketOffersLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-4 max-w-xl animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="h-12 max-w-2xl animate-pulse rounded-xl bg-zinc-100" />
      <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
      <MarketGridSkeleton />
    </div>
  );
}
