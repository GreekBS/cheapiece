import type { SupabaseClient } from "@supabase/supabase-js";

import { UNAVAILABLE_CART_LINE_TITLE } from "../constants";

export type CartOfferSnapshot = {
  id: string;
  productId: string;
  vendorId: string;
  state: string;
  stockQuantity: number;
  priceAmount: number;
  currency: string;
  productTitle: string;
  productSlug: string | null;
  productState: string;
  tenantId: string;
};

type OfferRow = {
  id: string;
  vendor_id: string;
  product_id: string;
  state: string;
  stock_quantity: number | null;
  price_amount: string | number;
  currency: string | null;
  tenant_id: string;
  products: { title: string; slug: string | null; state: string } | null;
};

const DISPLAY_OFFER_SELECT = `
  id,
  vendor_id,
  product_id,
  state,
  stock_quantity,
  price_amount,
  currency,
  tenant_id,
  products ( title, slug, state )
`;

const VALIDATION_OFFER_SELECT = `
  id,
  vendor_id,
  product_id,
  state,
  stock_quantity,
  price_amount,
  currency,
  tenant_id,
  products!inner ( title, slug, state )
`;

function parsePriceAmount(value: string | number): number {
  const price = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(price) ? price : 0;
}

function normalizeCurrency(raw: string | null | undefined): string {
  return raw && String(raw).length === 3 ? String(raw).toUpperCase() : "EUR";
}

function mapOfferRow(row: OfferRow): CartOfferSnapshot {
  return {
    id: row.id,
    productId: row.product_id,
    vendorId: row.vendor_id,
    state: row.state,
    stockQuantity: row.stock_quantity ?? 0,
    priceAmount: parsePriceAmount(row.price_amount),
    currency: normalizeCurrency(row.currency),
    productTitle: row.products?.title ?? UNAVAILABLE_CART_LINE_TITLE,
    productSlug: row.products?.slug ?? null,
    productState: row.products?.state ?? "inactive",
    tenantId: row.tenant_id,
  };
}

/** Strict validation for mutations: active offer + active product + tenant scope. */
export async function fetchOfferForCartValidation(
  supabase: SupabaseClient,
  offerId: string,
  tenantId: string,
): Promise<CartOfferSnapshot | null> {
  const { data, error } = await supabase
    .from("store_products")
    .select(VALIDATION_OFFER_SELECT)
    .eq("id", offerId)
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .eq("products.state", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOfferRow(data as unknown as OfferRow);
}

/** Display batch read: includes archived/paused offers so cart lines remain visible. */
export async function fetchOffersByIdsForCart(
  supabase: SupabaseClient,
  offerIds: string[],
  tenantId: string,
): Promise<Map<string, CartOfferSnapshot>> {
  const map = new Map<string, CartOfferSnapshot>();
  if (offerIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("store_products")
    .select(DISPLAY_OFFER_SELECT)
    .in("id", offerIds)
    .eq("tenant_id", tenantId);

  if (error || !data) {
    return map;
  }

  for (const row of data as unknown as OfferRow[]) {
    map.set(row.id, mapOfferRow(row));
  }

  return map;
}
