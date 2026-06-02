import { redirect } from "next/navigation";

import { merchantStoreOffersPath } from "@/lib/merchant/merchant-store-paths";
import { MERCHANT_ONBOARDING_PATH } from "@/lib/merchant/resolve-merchant-destination";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { pickPrimaryAccessibleVendor } from "@/modules/vendors/queries/vendor-queries";

/**
 * Phase 1.5: legacy `/merchant/listings` → canonical Store OS offers module.
 * Redirect-only; merchant writes use OfferForm (Phase 4 D2 removed listings actions).
 */
export async function redirectMerchantListingsToStoreOffers(): Promise<never> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/merchant");
  }

  const primary = await pickPrimaryAccessibleVendor(supabase, user.id);
  if (!primary) {
    redirect(MERCHANT_ONBOARDING_PATH);
  }

  redirect(merchantStoreOffersPath(primary.id));
}
