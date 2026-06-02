"use client";

import type { StoreOsProductTab } from "@/components/merchant-store/os/store-os-product-list-types";
import type { StoreOsActiveView, StoreOsWorkspaceData } from "@/components/merchant-store/os/store-os-view-types";
import { StoreOsOffersPanel } from "@/components/merchant-store/os/views/StoreOsOffersPanel";
import { StoreOsOverviewView } from "@/components/merchant-store/os/views/StoreOsOverviewView";
import { StoreOsProductsView } from "@/components/merchant-store/os/views/StoreOsProductsView";
type Props = {
  activeView: StoreOsActiveView;
  data: StoreOsWorkspaceData;
  vendorId: string;
  initialProductTab?: StoreOsProductTab;
  onViewChange: (view: StoreOsActiveView) => void;
};

export function StoreOsViewRenderer({
  activeView,
  data,
  vendorId,
  initialProductTab,
  onViewChange,
}: Props) {
  switch (activeView) {
    case "offers":
      return <StoreOsOffersPanel data={data} vendorId={vendorId} />;
    case "products":
      return (
        <StoreOsProductsView data={data} vendorId={vendorId} initialProductTab={initialProductTab} />
      );
    case "settings":
      return null;
    case "overview":
    default:
      return <StoreOsOverviewView data={data} vendorId={vendorId} onViewChange={onViewChange} />;
  }
}
