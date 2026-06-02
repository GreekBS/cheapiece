import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoreProductListRow, StoreProductRow } from "../types/store-product";

const listSelect = `
  id,
  vendor_id,
  product_id,
  state,
  price_amount,
  stock_quantity,
  condition,
  listing_variant_key,
  updated_at,
  products ( title, slug )
`;

export async function fetchStoreProductByIdForVendor(
  supabase: SupabaseClient,
  offerId: string,
  vendorId: string,
): Promise<StoreProductRow | null> {
  const { data, error } = await supabase
    .from("store_products")
    .select("id, vendor_id, product_id, state, price_amount, stock_quantity, condition, listing_variant_key")
    .eq("id", offerId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as StoreProductRow;
}

/** List row shape with explicit vendor_id filter (app-layer boundary, not RLS-only). */
export async function fetchStoreProductListRowByIdForVendor(
  supabase: SupabaseClient,
  offerId: string,
  vendorId: string,
): Promise<StoreProductListRow | null> {
  const { data, error } = await supabase
    .from("store_products")
    .select(listSelect)
    .eq("id", offerId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as unknown as StoreProductListRow;
}

export async function fetchStoreProductById(
  supabase: SupabaseClient,
  offerId: string,
): Promise<StoreProductListRow | null> {
  const { data, error } = await supabase
    .from("store_products")
    .select(listSelect)
    .eq("id", offerId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as unknown as StoreProductListRow;
}

/** Marketplace detail: active offer + active product (same visibility rules as listMarketOffers). */
export async function fetchMarketOfferById(
  supabase: SupabaseClient,
  offerId: string,
): Promise<StoreProductListRow | null> {
  const { data, error } = await supabase
    .from("store_products")
    .select(
      `
      id,
      vendor_id,
      product_id,
      state,
      price_amount,
      stock_quantity,
      condition,
      listing_variant_key,
      products!inner ( title, slug, state )
    `,
    )
    .eq("id", offerId)
    .eq("state", "active")
    .eq("products.state", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as unknown as StoreProductListRow;
}

export async function listVendorOffers(
  supabase: SupabaseClient,
  vendorId: string,
): Promise<StoreProductListRow[]> {
  const { data, error } = await supabase
    .from("store_products")
    .select(listSelect)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return data as unknown as StoreProductListRow[];
}

export async function listStoreProductsForVendorIds(
  supabase: SupabaseClient,
  vendorIds: string[],
): Promise<StoreProductListRow[]> {
  if (vendorIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("store_products")
    .select(listSelect)
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return data as unknown as StoreProductListRow[];
}

/** Authenticated marketplace: active offer + active catalog `products` row only (avoids vendor-scoped draft rows). */
export async function listMarketOffers(supabase: SupabaseClient): Promise<StoreProductListRow[]> {
  const { data, error } = await supabase
    .from("store_products")
    .select(
      `
      id,
      vendor_id,
      product_id,
      state,
      price_amount,
      stock_quantity,
      condition,
      listing_variant_key,
      products!inner ( title, slug, state )
    `,
    )
    .eq("state", "active")
    .eq("products.state", "active")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return data as unknown as StoreProductListRow[];
}

export async function insertStoreProduct(
  supabase: SupabaseClient,
  row: {
    vendor_id: string;
    product_id: string;
    condition: string;
    listing_variant_key: string;
    price_amount: number;
    currency: string;
    stock_quantity: number;
    state: string;
    created_by: string;
  },
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("store_products").insert({
    vendor_id: row.vendor_id,
    product_id: row.product_id,
    condition: row.condition,
    listing_variant_key: row.listing_variant_key,
    price_amount: row.price_amount,
    currency: row.currency,
    stock_quantity: row.stock_quantity,
    state: row.state,
    created_by: row.created_by,
  });

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export async function updateStoreProductPrice(
  supabase: SupabaseClient,
  params: {
    offerId: string;
    vendorId: string;
    priceAmount: number;
    updatedByUserId: string;
  },
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("store_products")
    .update({
      price_amount: params.priceAmount,
      updated_by: params.updatedByUserId,
    })
    .eq("id", params.offerId)
    .eq("vendor_id", params.vendorId);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export async function updateStoreProduct(
  supabase: SupabaseClient,
  params: {
    offerId: string;
    vendorId: string;
    priceAmount: number;
    stockQuantity: number;
    state: string;
    updatedByUserId: string;
    condition?: string;
    listingVariantKey?: string;
  },
): Promise<{ error: Error | null }> {
  const patch: Record<string, unknown> = {
    price_amount: params.priceAmount,
    stock_quantity: params.stockQuantity,
    state: params.state,
    updated_by: params.updatedByUserId,
  };
  if (params.condition !== undefined) {
    patch.condition = params.condition;
  }
  if (params.listingVariantKey !== undefined) {
    patch.listing_variant_key = params.listingVariantKey;
  }

  const { error } = await supabase.from("store_products").update(patch).eq("id", params.offerId).eq("vendor_id", params.vendorId);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}
