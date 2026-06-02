import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";

import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import { pickBestProductOfferV1, splitActiveOffersByStock } from "@/modules/market/utils/rank-product-offers-v1";



import type { ProductAggregateDTO, ProductIdentityDTO } from "../types/product-aggregate.dto";



import { mapPublicationToReadDto } from "./map-publication-read";



/**

 * Pure merge — no DB, no schema kernel, snapshot consumption only.

 */

export function mergeProductAggregate(args: {

  product: ProductIdentityDTO;

  publication: ProductCatalogPublicationRow | null;

  offers: MarketOfferDTO[];

}): ProductAggregateDTO {

  const publicationRead = args.publication ? mapPublicationToReadDto(args.publication) : null;

  const hasPublication = publicationRead !== null;

  const isSchemaDriven =

    hasPublication && (publicationRead.displaySnapshot.groups?.length ?? 0) > 0;



  const { buyableOffers, outOfStockOffers } = splitActiveOffersByStock(args.offers);



  return {

    product: args.product,

    publication: publicationRead,

    buyableOffers,

    outOfStockOffers,

    offers: [...buyableOffers, ...outOfStockOffers],

    primaryOffer: pickBestProductOfferV1(buyableOffers),

    hasPublication,

    isSchemaDriven,

  };

}


