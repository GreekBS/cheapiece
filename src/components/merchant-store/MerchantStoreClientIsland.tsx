"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { MerchantActiveVendor } from "@/lib/merchant/types";
import { parseStoreOsSearchParams } from "@/lib/merchant/parse-store-os-search-params";
import {
  merchantStoreBase,
  merchantStoreCatalogRequestLegacyPath,
  merchantStoreProductsRequestNewPath,
  merchantStoreSettingsPath,
} from "@/lib/merchant/merchant-store-paths";
import { storeOsViewToPath, viewFromStoreOsPathname } from "@/lib/merchant/resolve-store-os-view";
import { StoreOsViewRenderer } from "@/components/merchant-store/os/StoreOsViewRenderer";
import type { StoreOsActiveView, StoreOsWorkspaceData } from "@/components/merchant-store/os/store-os-view-types";
import type { StoreOsProductTab } from "@/components/merchant-store/os/store-os-product-list-types";

import { MerchantActiveVendorProvider } from "./MerchantActiveVendorContext";
import { MerchantStoreHeader } from "./MerchantStoreHeader";
import { MerchantStoreSidebar } from "./MerchantStoreSidebar";

type Props = {
  vendor: MerchantActiveVendor;
  userEmail: string;
  workspaceData: StoreOsWorkspaceData;
  children: React.ReactNode;
};

function isStoreOsFormRoute(pathname: string, vendorId: string): boolean {
  const base = merchantStoreBase(vendorId);
  if (pathname === `${base}/offers/new`) return true;
  if (pathname === merchantStoreProductsRequestNewPath(vendorId)) return true;
  if (pathname === merchantStoreCatalogRequestLegacyPath(vendorId)) return true;
  return /\/offers\/[^/]+\/edit$/.test(pathname);
}

function isStoreOsSettingsRoute(pathname: string, vendorId: string): boolean {
  return pathname === merchantStoreSettingsPath(vendorId);
}

function MerchantStoreClientIslandInner({ vendor, userEmail, workspaceData, children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const formRoute = isStoreOsFormRoute(pathname, vendor.vendorId);
  const settingsRoute = isStoreOsSettingsRoute(pathname, vendor.vendorId);
  const usePageChildren = formRoute || settingsRoute;

  /** Phase 4 A4: pathname-only module (legacy ?view= handled by server redirect A1). */
  const activeView = useMemo(
    () => viewFromStoreOsPathname(pathname, vendor.vendorId) ?? "overview",
    [pathname, vendor.vendorId],
  );

  const [initialProductTab, setInitialProductTab] = useState<StoreOsProductTab | undefined>(() =>
    parseStoreOsSearchParams(searchParams).productTab ?? undefined,
  );

  const navigateView = useCallback(
    (view: StoreOsActiveView) => {
      router.push(storeOsViewToPath(vendor.vendorId, view));
    },
    [router, vendor.vendorId],
  );

  useEffect(() => {
    if (formRoute) return;
    setInitialProductTab(parseStoreOsSearchParams(searchParams).productTab ?? undefined);
  }, [pathname, formRoute, searchParams]);

  return (
    <MerchantActiveVendorProvider value={vendor}>
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-slate-50/40 md:flex-row">
        <MerchantStoreSidebar activeView={activeView} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MerchantStoreHeader userEmail={userEmail} />
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {usePageChildren ? (
              children
            ) : (
              <StoreOsViewRenderer
                activeView={activeView}
                data={workspaceData}
                vendorId={vendor.vendorId}
                initialProductTab={initialProductTab}
                onViewChange={navigateView}
              />
            )}
          </div>
        </div>
      </div>
    </MerchantActiveVendorProvider>
  );
}

export function MerchantStoreClientIsland(props: Props) {
  return (
    <Suspense fallback={<MerchantStoreClientIslandFallback vendorName={props.vendor.vendorName} />}>
      <MerchantStoreClientIslandInner {...props} />
    </Suspense>
  );
}

function MerchantStoreClientIslandFallback({ vendorName }: { vendorName: string }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50/40 p-8">
      <p className="text-sm text-slate-500">Φόρτωση {vendorName}…</p>
    </div>
  );
}
