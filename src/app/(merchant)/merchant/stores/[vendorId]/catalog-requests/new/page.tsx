import { redirect } from "next/navigation";

import { merchantStoreProductsRequestNewPath } from "@/lib/merchant/merchant-store-paths";

type Props = { params: { vendorId: string } };

/** Legacy URL — permanent redirect to canonical `/products/requests/new`. */
export default function MerchantStoreCatalogRequestLegacyRedirectPage({ params }: Props) {
  redirect(merchantStoreProductsRequestNewPath(params.vendorId));
}
