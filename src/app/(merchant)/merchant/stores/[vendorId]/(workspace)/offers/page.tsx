import {
  redirectLegacyStoreOsViewIfPresent,
  type LegacyStoreOsSearchParams,
} from "@/lib/merchant/redirect-legacy-store-os-view-query";

type Props = {
  params: { vendorId: string };
  searchParams: LegacyStoreOsSearchParams;
};

/** Legacy offers list URL — content is rendered in-store via StoreOsViewRenderer. */
export default function MerchantStoreOffersPage({ params, searchParams }: Props) {
  redirectLegacyStoreOsViewIfPresent(params.vendorId, searchParams);
  return null;
}
