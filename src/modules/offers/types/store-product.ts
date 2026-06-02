/** Domain alias: `store_products` row = marketplace ProductOffer (commerce source of truth). */
export type ProductOffer = StoreProductRow;

export type StoreProductRow = {
  id: string;
  vendor_id: string;
  product_id: string;
  state: string;
  price_amount: string | number;
  stock_quantity?: number;
  condition?: string;
  listing_variant_key?: string;
  updated_at?: string;
};

export type StoreProductListRow = StoreProductRow & {
  products: { title: string; slug: string } | null;
};
