import {
  redirectLegacyStoreOsViewIfPresent,
  type LegacyStoreOsSearchParams,
} from "@/lib/merchant/redirect-legacy-store-os-view-query";

type Props = {
  params: { vendorId: string };
  searchParams: LegacyStoreOsSearchParams;
};

/** Phase 2 URL-first: shell renders products module via pathname. */
export default function MerchantStoreProductsPage({ params, searchParams }: Props) {
  redirectLegacyStoreOsViewIfPresent(params.vendorId, searchParams);
  return null;
}
