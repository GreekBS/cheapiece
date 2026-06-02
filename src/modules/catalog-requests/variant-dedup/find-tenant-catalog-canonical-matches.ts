import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeBrandModel, normalizeGtinMpn } from "./normalize-variant-attributes";
import { buildVariantSignatureInputFromProduct } from "./build-variant-signature-input-from-product";
import {
  computeCanonicalVariantSignature,
  computeWeakCanonicalVariantSignature,
} from "./variant-signatures";
import { logVariantDedupEvent } from "./variant-dedup-log";

const DEFAULT_SCAN_LIMIT = 25;

export type TenantCatalogMatchResult = {
  strictMatches: { productId: string }[];
  weakMatches: { productId: string }[];
  truncated: boolean;
};

type ProductCandidateRow = {
  id: string;
  brand: string | null;
  model: string | null;
  category_id: string | null;
};

async function listProductCandidates(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    categoryId: string | null;
    brand: string | null;
    model: string | null;
    limit: number;
  },
): Promise<{ rows: ProductCandidateRow[]; truncated: boolean }> {
  let q = supabase
    .from("products")
    .select("id, brand, model, category_id")
    .eq("tenant_id", params.tenantId)
    .eq("state", "active");

  if (params.categoryId) {
    q = q.eq("category_id", params.categoryId);
  }

  const { data, error } = await q.limit(params.limit + 1);

  if (error || !data) {
    return { rows: [], truncated: false };
  }

  const rows = data as ProductCandidateRow[];
  const truncated = rows.length > params.limit;
  const sliced = truncated ? rows.slice(0, params.limit) : rows;

  const normalizedBrand = normalizeBrandModel(params.brand);
  const normalizedModel = normalizeBrandModel(params.model);

  if (!normalizedBrand && !normalizedModel) {
    return { rows: sliced, truncated };
  }

  const filtered = sliced.filter((row) => {
    if (normalizedBrand && normalizeBrandModel(row.brand) !== normalizedBrand) {
      return false;
    }
    if (normalizedModel && normalizeBrandModel(row.model) !== normalizedModel) {
      return false;
    }
    return true;
  });

  return { rows: filtered, truncated };
}

async function listApprovedRequestProductIdsByGtin(
  supabase: SupabaseClient,
  tenantId: string,
  gtin: string,
): Promise<string[]> {
  const normalizedGtin = normalizeGtinMpn(gtin);
  if (!normalizedGtin) return [];

  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select("resolved_product_id, gtin")
    .eq("tenant_id", tenantId)
    .eq("status", "approved")
    .not("resolved_product_id", "is", null)
    .limit(50);

  if (error || !data) return [];

  const productIds: string[] = [];
  for (const row of data as { resolved_product_id: string | null; gtin: string | null }[]) {
    if (!row.resolved_product_id) continue;
    if (normalizeGtinMpn(row.gtin) === normalizedGtin) {
      productIds.push(row.resolved_product_id);
    }
  }

  return [...new Set(productIds)];
}

/**
 * Bounded read-only tenant catalog scan — compares strict and weak canonical hashes in app layer.
 */
export async function findTenantCatalogCanonicalMatches(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    strictCanonicalHash: string;
    weakCanonicalHash: string;
    hints: {
      categoryId: string | null;
      brand: string | null;
      model: string | null;
      gtin: string | null;
    };
    limit?: number;
  },
): Promise<TenantCatalogMatchResult> {
  const limit = params.limit ?? DEFAULT_SCAN_LIMIT;
  const strictMatches: { productId: string }[] = [];
  const weakMatches: { productId: string }[] = [];
  const seen = new Set<string>();

  const gtinProductIds = params.hints.gtin
    ? await listApprovedRequestProductIdsByGtin(supabase, params.tenantId, params.hints.gtin)
    : [];

  const { rows: productRows, truncated: productsTruncated } = await listProductCandidates(
    supabase,
    {
      tenantId: params.tenantId,
      categoryId: params.hints.categoryId,
      brand: params.hints.brand,
      model: params.hints.model,
      limit,
    },
  );

  const candidateIds = [...new Set([...gtinProductIds, ...productRows.map((r) => r.id)])].slice(
    0,
    limit + gtinProductIds.length,
  );

  const truncated =
    productsTruncated || candidateIds.length > limit;

  for (const productId of candidateIds.slice(0, limit)) {
    if (seen.has(productId)) continue;
    seen.add(productId);

    const productInput = await buildVariantSignatureInputFromProduct(
      supabase,
      productId,
      params.tenantId,
    );
    if (!productInput) continue;

    const productStrictHash = computeCanonicalVariantSignature(productInput);
    if (productStrictHash === params.strictCanonicalHash) {
      strictMatches.push({ productId });
      continue;
    }

    const productWeakHash = computeWeakCanonicalVariantSignature(productInput);
    if (productWeakHash === params.weakCanonicalHash) {
      weakMatches.push({ productId });
    }
  }

  if (truncated) {
    logVariantDedupEvent({
      event: "variant.tenant_scan_truncated",
      actionTaken: "tenant_catalog_scan",
      candidateProductId: candidateIds[0] ?? null,
    });
  }

  return { strictMatches, weakMatches, truncated };
}
