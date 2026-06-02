import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  buildStoreOsRedirectPath,
  type StoreOsRedirectTarget,
} from "@/lib/merchant/merchant-store-paths";
import { MERCHANT_ONBOARDING_PATH } from "@/lib/merchant/resolve-merchant-destination";
import { listAccessibleVendorIds, pickPrimaryAccessibleVendor } from "@/modules/vendors/queries/vendor-queries";

export type DashboardRedirectOptions = {
  vendorId?: string;
  productId?: string;
  offerId?: string;
};

/**
 * Phase 1: legacy `/dashboard/*` → canonical Store OS URLs (redirect only).
 */
export async function redirectDashboardToStoreOs(
  target: StoreOsRedirectTarget = "home",
  options?: DashboardRedirectOptions,
): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/merchant");
  }

  let vendorId = options?.vendorId?.trim();
  if (vendorId) {
    const accessibleIds = await listAccessibleVendorIds(supabase, user.id);
    if (!accessibleIds.includes(vendorId)) {
      vendorId = undefined;
    }
  }

  if (!vendorId) {
    const primary = await pickPrimaryAccessibleVendor(supabase, user.id);
    if (!primary) {
      redirect(MERCHANT_ONBOARDING_PATH);
    }
    vendorId = primary.id;
  }

  redirect(buildStoreOsRedirectPath(vendorId, target, options));
}
