"use client";



import { useMemo, useState } from "react";



import { StoreOsEmptyState } from "@/components/merchant-store/os/StoreOsEmptyState";

import { StoreOsOfferFilters, type OfferStatusFilter } from "@/components/merchant-store/os/StoreOsOfferFilters";

import { StoreOsOffersTable } from "@/components/merchant-store/os/StoreOsOffersTable";

import type { StoreOsWorkspaceData } from "@/components/merchant-store/os/store-os-view-types";

import {

  storeOsPage,

  storeOsPageHeader,

  storeOsSubtitle,

  storeOsTitle,

} from "@/components/merchant-store/os/store-os-tokens";

import type { VendorDashboardOfferRow } from "@/modules/offers/queries/vendor-dashboard-offers";



type Props = {

  data: StoreOsWorkspaceData;

  vendorId: string;

};



function filterOffers(offers: VendorDashboardOfferRow[], status: OfferStatusFilter) {

  if (status === "active") return offers.filter((o) => (o.state ?? "").toLowerCase() === "active");

  if (status === "draft") return offers.filter((o) => (o.state ?? "").toLowerCase() === "draft");

  return offers;

}



export function StoreOsOffersPanel({ data, vendorId }: Props) {

  const { offers, showEditAction, vendorName } = data;

  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>("all");

  const filtered = useMemo(() => filterOffers(offers, statusFilter), [offers, statusFilter]);



  return (

    <div className={storeOsPage}>

      <header className={storeOsPageHeader}>

        <div className="space-y-1">

          <h1 className={storeOsTitle}>Προσφορές</h1>

          <p className={storeOsSubtitle}>

            Διαχείριση προσφορών, τιμών και κατάστασης δημοσίευσης για {vendorName}.

          </p>

        </div>

      </header>



      {offers.length > 0 ? <StoreOsOfferFilters value={statusFilter} onChange={setStatusFilter} /> : null}



      {offers.length === 0 ? (

        <StoreOsEmptyState

          title="Δεν υπάρχουν προσφορές ακόμα"

          description="Οι προσφορές εμφανίζονται εδώ όταν υπάρχουν στο κατάστημά σας."

        />

      ) : filtered.length === 0 ? (

        <StoreOsEmptyState

          title="Καμία προσφορά σε αυτό το φίλτρο"

          description="Δοκιμάστε άλλο φίλτρο κατάστασης."

        />

      ) : (

        <StoreOsOffersTable offers={filtered} vendorId={vendorId} showEditAction={showEditAction} />

      )}

    </div>

  );

}

