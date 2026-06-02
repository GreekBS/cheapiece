import type { SupabaseClient } from "@supabase/supabase-js";

import type { MarketDiscoveryRow } from "../queries/search-market-offers";
import type { MarketOfferDTO } from "../types/market-offer.dto";
import { rankMarketOffers } from "../utils/ranking";

import { pickVendorDisplayName, resolveVendorDisplayNames } from "./vendor-display-resolver";

function toDTO(row: MarketDiscoveryRow, vendorMap: Map<string, string>): MarketOfferDTO {
  const price = typeof row.price_amount === "number" ? row.price_amount : parseFloat(String(row.price_amount));
  return {
    id: row.id,
    productId: row.product_id,
    title: row.products?.title ?? "Listing",
    slug: row.products?.slug ?? null,
    productBrand: row.products?.brand ?? null,
    productModel: row.products?.model ?? null,
    price: Number.isFinite(price) ? price : 0,
    currency: row.currency && String(row.currency).length === 3 ? String(row.currency).toUpperCase() : "EUR",
    condition: row.condition ?? "new",
    stock: row.stock_quantity ?? 0,
    vendorName: pickVendorDisplayName(row.vendor_id, vendorMap),
    updatedAt: row.updated_at,
  };
}

/** Map discovery rows to DTOs (rank + batch vendor resolve). */
export async function mapDiscoveryRowsToOfferDTOs(
  db: SupabaseClient,
  rows: MarketDiscoveryRow[],
): Promise<MarketOfferDTO[]> {
  if (rows.length === 0) {
    return [];
  }
  const ranked = rankMarketOffers(rows);
  const vendorMap = await resolveVendorDisplayNames(
    db,
    ranked.map((r) => r.vendor_id),
  );
  return ranked.map((r) => toDTO(r, vendorMap));
}
