import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import { buildVariantSignatureInputFromProduct } from "./build-variant-signature-input-from-product";
import { computeEffectiveApprovalSignatureInput } from "./compute-effective-approval-signature-input";
import { findPendingSiblingSameCanonical } from "./find-pending-sibling-requests";
import {
  computeCanonicalVariantSignature,
  isSparseVariantMetadata,
} from "./variant-signatures";

/**
 * Production audit helpers — read-only, bounded scans.
 * Override events are stdout-only; see `OVERRIDE_AUDIT_LOG_QUERY` below.
 */

export const OVERRIDE_AUDIT_LOG_QUERY = `
-- Override usage is emitted as structured stdout JSON (not persisted in DB).
-- Example log aggregation (Datadog / CloudWatch / Loki):
-- domain:catalog_variant_dedup event:variant.approval_create_override OR event:variant.approval_link_override
`;

export const DUPLICATE_CANONICAL_PRODUCTS_SQL = `
-- App-layer scan recommended (canonical hash not stored in DB).
-- See auditDuplicateCanonicalSignaturesAcrossProducts().
`;

export type DuplicateCanonicalCluster = {
  canonicalHash: string;
  productIds: string[];
};

export type PendingSiblingCluster = {
  vendorId: string;
  canonicalHash: string;
  requestIds: string[];
};

export type SparseMetadataCategoryRate = {
  categoryId: string | null;
  totalRequests: number;
  sparseCount: number;
  sparseRate: number;
};

export type LinkMismatchRiskRow = {
  requestId: string;
  vendorId: string;
  candidateProductId: string;
  requestHash: string;
  productHash: string | null;
};

export type DuplicateApprovedRequestCluster = {
  vendorId: string;
  canonicalHash: string;
  requestIds: string[];
  resolvedProductIds: string[];
};

const REQUEST_AUDIT_SELECT =
  "id, tenant_id, vendor_id, status, category_id, brand, model, gtin, mpn, attribute_payload, resolved_product_id, merchant_hidden_at";

/** Bounded scan: active products in tenant grouped by strict canonical signature. */
export async function auditDuplicateCanonicalSignaturesAcrossProducts(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { limit?: number },
): Promise<DuplicateCanonicalCluster[]> {
  const limit = options?.limit ?? 40;
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .limit(limit);

  if (error || !data) return [];

  const hashToProducts = new Map<string, string[]>();

  for (const row of data as { id: string }[]) {
    const input = await buildVariantSignatureInputFromProduct(supabase, row.id, tenantId);
    if (!input) continue;
    const hash = computeCanonicalVariantSignature(input);
    const list = hashToProducts.get(hash) ?? [];
    list.push(row.id);
    hashToProducts.set(hash, list);
  }

  return [...hashToProducts.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([canonicalHash, productIds]) => ({ canonicalHash, productIds }));
}

/** Pending requests grouped by vendor + identical canonical hash (sibling clusters). */
export async function auditPendingSiblingClustersByVendor(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<PendingSiblingCluster[]> {
  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select(REQUEST_AUDIT_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .is("merchant_hidden_at", null);

  if (error || !data) return [];

  const clusters = new Map<string, PendingSiblingCluster>();

  for (const row of data as CatalogProductRequestRow[]) {
    const input = computeEffectiveApprovalSignatureInput(row);
    const hash = computeCanonicalVariantSignature(input);
    const key = `${row.vendor_id}:${hash}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.requestIds.push(row.id);
    } else {
      clusters.set(key, {
        vendorId: row.vendor_id,
        canonicalHash: hash,
        requestIds: [row.id],
      });
    }
  }

  return [...clusters.values()].filter((c) => c.requestIds.length > 1);
}

/** Sparse metadata rate grouped by category for pending + approved requests. */
export async function auditSparseMetadataRateByCategory(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<SparseMetadataCategoryRate[]> {
  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select(REQUEST_AUDIT_SELECT)
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "approved"])
    .is("merchant_hidden_at", null);

  if (error || !data) return [];

  const byCategory = new Map<string | null, { total: number; sparse: number }>();

  for (const row of data as CatalogProductRequestRow[]) {
    const cat = row.category_id;
    const bucket = byCategory.get(cat) ?? { total: 0, sparse: 0 };
    bucket.total += 1;
    if (isSparseVariantMetadata(computeEffectiveApprovalSignatureInput(row))) {
      bucket.sparse += 1;
    }
    byCategory.set(cat, bucket);
  }

  return [...byCategory.entries()].map(([categoryId, stats]) => ({
    categoryId,
    totalRequests: stats.total,
    sparseCount: stats.sparse,
    sparseRate: stats.total > 0 ? stats.sparse / stats.total : 0,
  }));
}

/** Approved requests from same vendor sharing canonical hash (retrospective duplicate audit). */
export async function auditDuplicateApprovedRequestClusters(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<DuplicateApprovedRequestCluster[]> {
  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select(REQUEST_AUDIT_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "approved")
    .is("merchant_hidden_at", null);

  if (error || !data) return [];

  const clusters = new Map<string, DuplicateApprovedRequestCluster>();

  for (const row of data as CatalogProductRequestRow[]) {
    const input = computeEffectiveApprovalSignatureInput(row);
    const hash = computeCanonicalVariantSignature(input);
    const key = `${row.vendor_id}:${hash}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.requestIds.push(row.id);
      if (row.resolved_product_id) {
        existing.resolvedProductIds.push(row.resolved_product_id);
      }
    } else {
      clusters.set(key, {
        vendorId: row.vendor_id,
        canonicalHash: hash,
        requestIds: [row.id],
        resolvedProductIds: row.resolved_product_id ? [row.resolved_product_id] : [],
      });
    }
  }

  return [...clusters.values()].filter((c) => c.requestIds.length > 1);
}

/** Pending requests with match candidate whose product canonical hash differs (link mismatch risk). */
export async function auditLinkMismatchRisks(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { limit?: number },
): Promise<LinkMismatchRiskRow[]> {
  const limit = options?.limit ?? 30;
  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select(REQUEST_AUDIT_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .is("merchant_hidden_at", null)
    .limit(limit);

  if (error || !data) return [];

  const risks: LinkMismatchRiskRow[] = [];

  for (const row of data as CatalogProductRequestRow[]) {
    const siblings = await findPendingSiblingSameCanonical(supabase, {
      vendorId: row.vendor_id,
      excludeRequestId: row.id,
      canonicalHash: computeCanonicalVariantSignature(
        computeEffectiveApprovalSignatureInput(row),
      ),
    });
    if (siblings.requestIds.length === 0) continue;

    const { data: matchRow } = await supabase
      .from("catalog_request_matches")
      .select("suggested_product_id, merchant_selected_product_id, match_reviewed_product_id")
      .eq("request_id", row.id)
      .maybeSingle();

    if (!matchRow) continue;

    const candidate =
      (matchRow as { match_reviewed_product_id?: string | null }).match_reviewed_product_id ??
      (matchRow as { merchant_selected_product_id?: string | null }).merchant_selected_product_id ??
      (matchRow as { suggested_product_id?: string | null }).suggested_product_id ??
      null;

    if (!candidate) continue;

    const requestInput = computeEffectiveApprovalSignatureInput(row);
    const requestHash = computeCanonicalVariantSignature(requestInput);
    const productInput = await buildVariantSignatureInputFromProduct(
      supabase,
      candidate,
      tenantId,
    );
    const productHash = productInput
      ? computeCanonicalVariantSignature(productInput)
      : null;

    if (productHash && productHash !== requestHash) {
      risks.push({
        requestId: row.id,
        vendorId: row.vendor_id,
        candidateProductId: candidate,
        requestHash,
        productHash,
      });
    }
  }

  return risks;
}
