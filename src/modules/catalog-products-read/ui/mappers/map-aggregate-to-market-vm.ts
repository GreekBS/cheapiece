import type { ProductAggregateDTO } from "../../types/product-aggregate.dto";
import type { ProductMarketStatsRow } from "../../queries/product-market-stats-queries";
import type { ProductMarketOfferVM, ProductMarketViewModel } from "../dto/product-market.vm";

type StatsPick = Pick<
  ProductMarketStatsRow,
  "active_offer_count" | "buyable_offer_count" | "stats_version" | "computed_at"
>;

function mapOffer(offer: ProductAggregateDTO["buyableOffers"][number]): ProductMarketOfferVM {
  return {
    id: offer.id,
    productId: offer.productId,
    title: offer.title,
    price: offer.price,
    currency: offer.currency,
    condition: offer.condition,
    stock: offer.stock,
    vendorName: offer.vendorName,
    updatedAt: offer.updatedAt,
  };
}

function deriveOfferStateFlags(aggregate: ProductAggregateDTO) {
  const hasActiveOffers = aggregate.offers.length > 0;
  const hasBuyableOffers = aggregate.buyableOffers.length > 0;
  return {
    hasActiveOffers,
    hasBuyableOffers,
    isOfferless: !hasActiveOffers,
  };
}

function mapIdentityFields(aggregate: ProductAggregateDTO) {
  const publication = aggregate.publication;
  const displaySnapshot = publication?.displaySnapshot;
  const scalars = displaySnapshot?.scalars ?? null;

  return {
    productId: aggregate.product.id,
    tenantId: aggregate.product.tenantId,
    title: scalars?.title ?? aggregate.product.title,
    brand: scalars?.brand ?? aggregate.product.brand,
    model: scalars?.model ?? aggregate.product.model,
    slug: aggregate.product.slug,
    categoryId: aggregate.product.categoryId,
    hasPublication: aggregate.hasPublication,
    isSchemaDriven: aggregate.isSchemaDriven,
    locale: publication?.locale ?? null,
    scalars,
    specGroups: displaySnapshot?.groups ?? [],
    buyableOffers: aggregate.buyableOffers.map(mapOffer),
    outOfStockOffers: aggregate.outOfStockOffers.map(mapOffer),
    primaryOffer: aggregate.primaryOffer ? mapOffer(aggregate.primaryOffer) : null,
  };
}

/** Public marketplace PDP mapper — aggregate UI truth; stats optional enrichment. */
export function mapAggregateToPublicProductMarketVM(
  aggregate: ProductAggregateDTO,
  stats: StatsPick | null,
): ProductMarketViewModel {
  const flags = deriveOfferStateFlags(aggregate);
  const hasStatsSnapshot = stats !== null;

  return {
    ...mapIdentityFields(aggregate),
    ...flags,
    hasStatsSnapshot,
    activeOfferCount: hasStatsSnapshot ? stats.active_offer_count : aggregate.offers.length,
    buyableOfferCount: hasStatsSnapshot ? stats.buyable_offer_count : aggregate.buyableOffers.length,
    statsVersion: hasStatsSnapshot ? stats.stats_version : 0,
    computedAt: hasStatsSnapshot ? stats.computed_at : null,
    primaryImageUrl: null,
    galleryImages: [],
  };
}

export function mapAggregateToProductMarketVM(aggregate: ProductAggregateDTO, stats: StatsPick): ProductMarketViewModel {
  return mapAggregateToPublicProductMarketVM(aggregate, stats);
}

/** Admin preview when stats row may be absent — not used on public PDP. */
export function mapAggregateToAdminPreviewMarketVM(aggregate: ProductAggregateDTO): ProductMarketViewModel {
  const flags = deriveOfferStateFlags(aggregate);

  return {
    ...mapIdentityFields(aggregate),
    ...flags,
    hasStatsSnapshot: false,
    activeOfferCount: aggregate.offers.length,
    buyableOfferCount: aggregate.buyableOffers.length,
    statsVersion: 0,
    computedAt: new Date(0).toISOString(),
    primaryImageUrl: null,
    galleryImages: [],
  };
}
