import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCatalogRequestReviewForms } from "@/components/admin/catalog-requests/AdminCatalogRequestReviewForms";
import { AdminRequestReviewPreview } from "@/components/admin/catalog-requests/AdminRequestReviewPreview";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProductAggregate } from "@/modules/catalog-products-read/services/get-product-aggregate";
import { mapAggregateToAdminPreviewMarketVM } from "@/modules/catalog-products-read/ui/mappers/map-aggregate-to-market-vm";
import { toAdminRequestPreviewVM } from "@/modules/catalog-products-read/ui/mappers/to-admin-request-preview.vm";
import { resolveMarketplaceProductAccess } from "@/modules/catalog-products-read/ui/policy/marketplace-product-access";
import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";
import { CatalogRequestMatchComparison } from "@/components/admin/catalog-requests/CatalogRequestMatchComparison";
import { fetchCatalogRequestMatchByRequestId } from "@/modules/catalog-request-matching/queries/fetch-catalog-request-match";
import { fetchProductMatchLabelsByIds } from "@/modules/catalog-request-matching/queries/fetch-product-match-labels";
import { fetchCatalogProductRequestById } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import { resolveCatalogApprovalRecommendation } from "@/modules/catalog-requests/variant-dedup";

async function fetchActiveCategories(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as { id: string; name: string }[];
}

async function loadPublishedProductVm(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  productId: string,
  tenantId: string,
): Promise<ProductMarketViewModel | null> {
  const aggregate = await getProductAggregate(supabase, productId, { tenantId });
  const access = resolveMarketplaceProductAccess(aggregate, { tenantId });
  if (access.kind === "not_found" || !aggregate) {
    return null;
  }
  return mapAggregateToAdminPreviewMarketVM(aggregate);
}

type Props = { params: { id: string } };

export default async function AdminCatalogRequestDetailPage({ params }: Props) {
  const { supabase } = await requirePlatformAdmin();
  const result = await fetchCatalogProductRequestById(supabase, params.id);

  const showError = result.error;
  const showNotFound = !result.error && result.data === null;

  if (showError) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/admin/catalog-requests" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Λίστα αιτήσεων
        </Link>
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {result.errorMessage ?? "Αδυναμία φόρτωσης αιτήσης καταλόγου. Δοκίμασε ανανέωση."}
        </p>
      </div>
    );
  }

  if (showNotFound) {
    notFound();
  }

  const request = result.data!;

  const preview = toAdminRequestPreviewVM(request, {
    vendorLabel: request.vendor_name ?? request.vendor_id,
  });

  let publishedProduct: ProductMarketViewModel | null = null;
  if (request.status === "approved" && request.resolved_product_id) {
    publishedProduct = await loadPublishedProductVm(
      supabase,
      request.resolved_product_id,
      request.tenant_id,
    );
  }

  const categories = await fetchActiveCategories(supabase, request.tenant_id);

  const matchResult = await fetchCatalogRequestMatchByRequestId(supabase, request.id);

  const recommendation = await resolveCatalogApprovalRecommendation(
    supabase,
    request,
    matchResult.error ? null : matchResult.data,
  );

  const productIds = [
    matchResult.data?.suggested_product_id,
    matchResult.data?.merchant_selected_product_id,
    recommendation.candidateProductId,
    recommendation.tenantCatalogStrictMatchProductId,
  ].filter((id): id is string => Boolean(id));
  const productLabels = await fetchProductMatchLabelsByIds(supabase, productIds);
  const suggestedProduct = matchResult.data?.suggested_product_id
    ? productLabels.get(matchResult.data.suggested_product_id) ?? null
    : null;
  const merchantSelectedProduct = matchResult.data?.merchant_selected_product_id
    ? productLabels.get(matchResult.data.merchant_selected_product_id) ?? null
    : null;

  const candidateId =
    recommendation.candidateProductId ?? recommendation.tenantCatalogStrictMatchProductId;
  const candidateProduct = candidateId ? productLabels.get(candidateId) ?? null : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/catalog-requests" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Λίστα αιτήσεων
        </Link>
      </div>

      <CatalogRequestMatchComparison
        preview={preview}
        match={matchResult.error ? null : matchResult.data}
        suggestedProduct={suggestedProduct}
        merchantSelectedProduct={merchantSelectedProduct}
      />

      {matchResult.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {matchResult.errorMessage ?? "Αδυναμία φόρτωσης δεδομένων ταξινόμησης."}
        </p>
      ) : null}

      <AdminRequestReviewPreview preview={preview} publishedProduct={publishedProduct} />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Απόφαση έγκρισης</h2>
        <div className="mt-4">
          <AdminCatalogRequestReviewForms
            request={request}
            categories={categories}
            suggestedProductId={matchResult.data?.suggested_product_id ?? null}
            merchantSelectedProductId={matchResult.data?.merchant_selected_product_id ?? null}
            recommendation={recommendation}
            candidateProduct={candidateProduct}
          />
        </div>
      </div>
    </div>
  );
}