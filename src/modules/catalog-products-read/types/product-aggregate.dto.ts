import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";



import type { ProductPublicationReadDTO } from "./product-publication-read.dto";



/** Catalog identity — `products` row (read path). */

export type ProductIdentityDTO = {

  id: string;

  tenantId: string;

  title: string;

  brand: string | null;

  model: string | null;

  slug: string;

  categoryId: string | null;

  state: string;

};



/**

 * Canonical marketplace product read contract (Phase 3B).

 * Commerce rows are split into buyable vs out-of-stock (active only).

 */

export type ProductAggregateDTO = {

  product: ProductIdentityDTO;

  publication: ProductPublicationReadDTO | null;

  /** Active offers with stock > 0, ranked V1. */

  buyableOffers: MarketOfferDTO[];

  /** Active offers with stock = 0, ranked V1. */

  outOfStockOffers: MarketOfferDTO[];

  /** All active offers (buyable then OOS) — admin / legacy read paths. */

  offers: MarketOfferDTO[];

  primaryOffer: MarketOfferDTO | null;

  hasPublication: boolean;

  /** True when publication has schema-driven display groups (snapshot-only heuristic). */

  isSchemaDriven: boolean;

};


