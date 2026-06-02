"use client";

import { StoreOsActivityList } from "@/components/merchant-store/os/StoreOsActivityList";
import { StoreOsHealthCard } from "@/components/merchant-store/os/StoreOsHealthCard";
import { StoreOsKpiStrip } from "@/components/merchant-store/os/StoreOsKpiStrip";
import { StoreOsPrimaryActionCard } from "@/components/merchant-store/os/StoreOsPrimaryActionCard";
import { StoreOsQuickShortcuts } from "@/components/merchant-store/os/StoreOsQuickShortcuts";
import type { StoreOsActiveView, StoreOsWorkspaceData } from "@/components/merchant-store/os/store-os-view-types";
import { storeOsPage, storeOsPageHeader, storeOsSubtitle, storeOsTitle } from "@/components/merchant-store/os/store-os-tokens";
import { merchantStoreProductsRequestNewPath } from "@/lib/merchant/merchant-store-paths";

type Props = {
  data: StoreOsWorkspaceData;
  vendorId: string;
  onViewChange: (view: StoreOsActiveView) => void;
};

export function StoreOsOverviewView({ data, vendorId, onViewChange }: Props) {
  const { stats, vendorName } = data;
  const hasProducts = data.catalogRequests.length > 0;
  const primaryTitle = hasProducts ? "Αίτηση νέου προϊόντος" : "Δημιουργήστε το πρώτο προϊόν";
  const primaryDescription = hasProducts
    ? "Υποβάλετε νέα αίτηση καταλόγου για έγκριση από τη διαχείριση."
    : "Ξεκινήστε με αίτηση νέου προϊόντος καταλόγου — μετά την έγκριση μπορείτε να δημοσιεύσετε προσφορά.";
  const primaryCta = hasProducts ? "Νέα αίτηση προϊόντος" : "Δημιουργία προϊόντος";

  return (
    <div className={storeOsPage}>
      <header className={storeOsPageHeader}>
        <h1 className={storeOsTitle}>Overview</h1>
        <p className={storeOsSubtitle}>Store operations for {vendorName}</p>
      </header>

      <StoreOsKpiStrip
        items={[
          { label: "Store views", value: "—", hint: "Analytics coming soon" },
          { label: "Active offers", value: String(stats.activeOffers) },
          { label: "Draft offers", value: String(stats.draftOffers) },
          { label: "Conversion", value: "—", hint: "Tracked when live" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <StoreOsPrimaryActionCard
          title={primaryTitle}
          description={primaryDescription}
          ctaHref={merchantStoreProductsRequestNewPath(vendorId)}
          ctaLabel={primaryCta}
        />
        <StoreOsHealthCard percent={stats.completenessPercent} items={stats.completenessItems} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StoreOsActivityList
          items={stats.recentActivity}
          emptyMessage="No offer activity yet. Create an offer after a catalog product is approved."
        />
        <StoreOsQuickShortcuts
          shortcuts={[
            {
              kind: "view",
              view: "offers",
              label: "Manage offers",
              description: "Review active and draft offers",
            },
            {
              kind: "view",
              view: "products",
              label: "Products",
              description: "Catalog requests and product operations",
            },
            {
              kind: "href",
              href: merchantStoreProductsRequestNewPath(vendorId),
              label: "New catalog request",
              description: "Submit a product for admin approval",
            },
            {
              kind: "view",
              view: "offers",
              label: "Offer pipeline",
              description: `${stats.totalOffers} total offers in workspace`,
            },
          ]}
          onViewChange={onViewChange}
        />
      </div>
    </div>
  );
}
