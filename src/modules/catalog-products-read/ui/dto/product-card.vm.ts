/** Category listing card — price optional when no primary offer. */
export type ProductCardViewModel = {
  productId: string;
  title: string;
  brand: string | null;
  model: string | null;
  slug: string;
  categoryId: string | null;
  priceLabel: string | null;
  currency: string | null;
  vendorName: string | null;
  hasOffers: boolean;
  offerCount: number;
  primaryImageUrl?: string | null;
};
