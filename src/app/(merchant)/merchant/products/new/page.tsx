/**
 * Legacy wizard route — redirect only (Phase 4 B1).
 * Canonical product intake: `/merchant/stores/{vendorId}/products/requests/new`.
 * `MerchantProductResolutionWizard` remains in codebase; not mounted here.
 */

import { redirect } from "next/navigation";

import { merchantStoreProductsRequestNewPath } from "@/lib/merchant/merchant-store-paths";
import { MERCHANT_ONBOARDING_PATH } from "@/lib/merchant/resolve-merchant-destination";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listAccessibleVendorIds, pickPrimaryAccessibleVendor } from "@/modules/vendors/queries/vendor-queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: { vendorId?: string };
};

export default async function MerchantProductWizardLegacyRedirectPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/merchant");
  }

  const accessibleIds = await listAccessibleVendorIds(supabase, user.id);
  const requestedVendorId = searchParams.vendorId?.trim();
  let vendorId =
    requestedVendorId && accessibleIds.includes(requestedVendorId) ? requestedVendorId : undefined;

  if (!vendorId) {
    const primary = await pickPrimaryAccessibleVendor(supabase, user.id);
    if (!primary) {
      redirect(MERCHANT_ONBOARDING_PATH);
    }
    vendorId = primary.id;
  }

  redirect(merchantStoreProductsRequestNewPath(vendorId));
}
