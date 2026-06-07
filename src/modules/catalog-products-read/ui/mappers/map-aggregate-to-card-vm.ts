import type { ProductAggregateDTO } from "../../types/product-aggregate.dto";
import type { ProductCardViewModel } from "../dto/product-card.vm";

function formatPriceLabel(price: number, currency: string): string | null {
  if (!Number.isFinite(price)) {
    return null;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

/** Pure aggregate → listing card VM. */
export function mapAggregateToProductCardVM(
  aggregate: ProductAggregateDTO,
  primaryImageUrl?: string | null,
): ProductCardViewModel {
  const primary = aggregate.primaryOffer;
  const publication = aggregate.publication;
  const scalars = publication?.displaySnapshot?.scalars;
  const activeCount = aggregate.offers.length;

  return {
    productId: aggregate.product.id,
    title: scalars?.title ?? aggregate.product.title,
    brand: scalars?.brand ?? aggregate.product.brand,
    model: scalars?.model ?? aggregate.product.model,
    slug: aggregate.product.slug,
    categoryId: aggregate.product.categoryId,
    priceLabel: primary ? formatPriceLabel(primary.price, primary.currency) : null,
    currency: primary?.currency ?? null,
    vendorName: primary?.vendorName ?? null,
    hasOffers: activeCount > 0,
    offerCount: activeCount,
    primaryImageUrl: primaryImageUrl ?? null,
    primaryOfferId: primary?.id ?? null,
    primaryOfferStock: primary?.stock ?? 0,
  };
}
