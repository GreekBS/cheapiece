import { redirect } from "next/navigation";

import { merchantStoreHomePath } from "@/lib/merchant/merchant-store-paths";
import {
  redirectLegacyStoreOsViewIfPresent,
  type LegacyStoreOsSearchParams,
} from "@/lib/merchant/redirect-legacy-store-os-view-query";

type Props = {
  params: { vendorId: string };
  searchParams: LegacyStoreOsSearchParams;
};

/** Store root: legacy `?view=` → canonical path; otherwise `/home`. */
export default function MerchantStoreRootRedirectPage({ params, searchParams }: Props) {
  const vendorId = params.vendorId;
  redirectLegacyStoreOsViewIfPresent(vendorId, searchParams);
  redirect(merchantStoreHomePath(vendorId));
}
