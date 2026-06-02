import { MerchantStoreClientIsland } from "@/components/merchant-store/MerchantStoreClientIsland";
import type { StoreOsWorkspaceData } from "@/components/merchant-store/os/store-os-view-types";
import type { MerchantActiveVendor } from "@/lib/merchant/types";
import type { VendorRow } from "@/modules/vendors/queries/vendor-queries";

export function buildMerchantActiveVendor(vendor: VendorRow): MerchantActiveVendor {
  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    tenantId: vendor.tenant_id,
    vendorState: vendor.state,
    logoUrl: vendor.logo_url ?? null,
  };
}

type RenderMerchantStoreShellArgs = {
  vendor: VendorRow;
  userEmail: string;
  workspaceData: StoreOsWorkspaceData;
  children: React.ReactNode;
};

export function renderMerchantStoreShell({
  vendor,
  userEmail,
  workspaceData,
  children,
}: RenderMerchantStoreShellArgs) {
  return (
    <MerchantStoreClientIsland
      vendor={buildMerchantActiveVendor(vendor)}
      userEmail={userEmail}
      workspaceData={workspaceData}
    >
      {children}
    </MerchantStoreClientIsland>
  );
}
