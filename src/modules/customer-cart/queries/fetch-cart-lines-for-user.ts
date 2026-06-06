import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { resolveVendorDisplayProfiles } from "@/modules/market/services/vendor-display-resolver";
import { getPrimaryImagesMap } from "@/modules/product-images/server/resolve-public-product-images";

import { mapCartLineViewModel, pickVendorForOffer } from "../mappers/map-cart-line-vm";
import type { CartLineViewModel } from "../types/cart-line.vm";
import { fetchOffersByIdsForCart } from "./fetch-offers-for-cart-validation";
import { fetchCartRowsForUser } from "./fetch-cart-rows-for-user";

export async function fetchCartLinesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<CartLineViewModel[]> {
  const tenantId = getPublicMarketplaceTenantId();
  const rows = await fetchCartRowsForUser(supabase, userId);
  if (rows.length === 0) {
    return [];
  }

  const offerIds = rows.map((row) => row.offerId);
  const offersById = await fetchOffersByIdsForCart(supabase, offerIds, tenantId);
  const productIds = [...new Set([...offersById.values()].map((offer) => offer.productId).filter(Boolean))];
  const vendorIds = [...new Set([...offersById.values()].map((offer) => offer.vendorId).filter(Boolean))];

  const [imageMap, vendorMap] = await Promise.all([
    getPrimaryImagesMap(tenantId, productIds, supabase),
    resolveVendorDisplayProfiles(supabase, vendorIds),
  ]);

  return rows.map((row) => {
    const offer = offersById.get(row.offerId);
    const productId = offer?.productId ?? "";
    return mapCartLineViewModel({
      row,
      offer,
      tenantId,
      imageUrl: productId ? (imageMap.get(productId) ?? null) : null,
      vendor: pickVendorForOffer(offer, vendorMap),
    });
  });
}

export function buildCartSnapshot(lines: CartLineViewModel[]): {
  lines: CartLineViewModel[];
  lineCount: number;
  itemCount: number;
  subtotalAmount: number;
  currency: string;
} {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const availableLines = lines.filter((line) => line.isAvailable);
  const currency = availableLines[0]?.currency ?? lines[0]?.currency ?? "EUR";
  const subtotalAmount = availableLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  return {
    lines,
    lineCount: lines.length,
    itemCount,
    subtotalAmount,
    currency,
  };
}
