import { redirectMerchantListingsToStoreOffers } from "@/lib/merchant/redirect-merchant-listings";

/**
 * Phase 1.5 — legacy listings route (redirect only).
 * Phase 4 D2: listings write path removed; OfferForm is the only merchant write surface.
 * Canonical offers: `/merchant/stores/{vendorId}/offers` via OfferForm.
 */
export const dynamic = "force-dynamic";

export default async function MerchantListingsPage() {
  await redirectMerchantListingsToStoreOffers();
}
