import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";
import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import { mergeProductAggregate } from "../application/merge-product-aggregate";
import type { ProductAggregateDTO, ProductIdentityDTO } from "../types/product-aggregate.dto";

/**
 * Batch merge for category listing — never call getProductAggregate in a loop.
 */
export function mergeProductAggregatesForListing(args: {
  products: ProductIdentityDTO[];
  publicationsByProductId: Map<string, ProductCatalogPublicationRow>;
  offersByProductId: Map<string, MarketOfferDTO[]>;
}): ProductAggregateDTO[] {
  return args.products.map((product) =>
    mergeProductAggregate({
      product,
      publication: args.publicationsByProductId.get(product.id) ?? null,
      offers: args.offersByProductId.get(product.id) ?? [],
    }),
  );
}
