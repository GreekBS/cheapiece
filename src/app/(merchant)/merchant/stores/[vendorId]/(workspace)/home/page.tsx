import {
  redirectLegacyStoreOsViewIfPresent,
  type LegacyStoreOsSearchParams,
} from "@/lib/merchant/redirect-legacy-store-os-view-query";

type Props = {
  params: { vendorId: string };
  searchParams: LegacyStoreOsSearchParams;
};

/** Phase 2 URL-first: shell renders overview via pathname (see MerchantStoreClientIsland). */
export default function MerchantStoreHomePage({ params, searchParams }: Props) {
  redirectLegacyStoreOsViewIfPresent(params.vendorId, searchParams);
  return null;
}
