/** Single active store for merchant isolated workspace (no stores[]). */
export type MerchantActiveVendor = {
  vendorId: string;
  vendorName: string;
  tenantId: string;
  vendorState?: string;
  logoUrl?: string | null;
};
