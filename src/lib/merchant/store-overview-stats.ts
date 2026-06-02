import type { VendorDashboardOfferRow } from "@/modules/offers/queries/vendor-dashboard-offers";

export type StoreOverviewStats = {
  totalOffers: number;
  activeOffers: number;
  draftOffers: number;
  pausedOffers: number;
  completenessPercent: number;
  completenessItems: { label: string; done: boolean }[];
  recentActivity: { id: string; title: string; detail: string; at: string | null }[];
};

function normState(state: string | null | undefined): string {
  return (state ?? "").toLowerCase();
}

/** Derives overview KPIs from existing offer rows — no new backend queries. */
export function buildStoreOverviewStats(offers: VendorDashboardOfferRow[]): StoreOverviewStats {
  let activeOffers = 0;
  let draftOffers = 0;
  let pausedOffers = 0;

  for (const o of offers) {
    const s = normState(o.state);
    if (s === "active") activeOffers += 1;
    else if (s === "draft") draftOffers += 1;
    else if (s === "paused") pausedOffers += 1;
  }

  const hasActiveOffer = activeOffers > 0;
  const hasAnyOffer = offers.length > 0;
  const completenessItems = [
    { label: "Store profile created", done: true },
    { label: "First offer drafted", done: hasAnyOffer },
    { label: "Active offer published", done: hasActiveOffer },
  ];
  const doneCount = completenessItems.filter((i) => i.done).length;
  const completenessPercent = Math.round((doneCount / completenessItems.length) * 100);

  const recentActivity = offers.slice(0, 6).map((o) => ({
    id: o.id,
    title: o.products?.title ?? "Offer updated",
    detail: `Status: ${o.state ?? "unknown"}`,
    at: o.updated_at,
  }));

  return {
    totalOffers: offers.length,
    activeOffers,
    draftOffers,
    pausedOffers,
    completenessPercent,
    completenessItems,
    recentActivity,
  };
}
