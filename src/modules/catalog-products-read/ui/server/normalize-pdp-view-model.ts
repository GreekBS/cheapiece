import type { ProductAggregateDTO } from "../../types/product-aggregate.dto";
import type { ProductMarketStatsRow } from "../../queries/product-market-stats-queries";
import type { ProductMarketViewModel } from "../dto/product-market.vm";
import { mapAggregateToPublicProductMarketVM } from "../mappers/map-aggregate-to-market-vm";

/**
 * Reconcile a cached PDP envelope with live aggregate (INV-2: aggregate is UI truth).
 * Always rebuilds offer slices and flags; safe when cached JSON lacks new fields.
 */
export function normalizePdpViewModelFromCache(
  _cached: ProductMarketViewModel,
  aggregate: ProductAggregateDTO,
  stats: ProductMarketStatsRow | null,
): ProductMarketViewModel {
  return mapAggregateToPublicProductMarketVM(aggregate, stats);
}
