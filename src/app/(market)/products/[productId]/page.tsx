import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getFavoriteIdsForUser } from "@/actions/customer-favorites";
import { ProductMarketDetailView } from "@/components/market/ProductMarketDetailView";
import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductDisplaySpecsSection } from "@/modules/catalog-products-read/ui/components/ProductDisplaySpecsSection";
import { buildPdpMetadata } from "@/modules/catalog-products-read/ui/server/build-pdp-metadata";
import { loadCatalogPdpPage } from "@/modules/catalog-products-read/ui/server/load-catalog-pdp";

type Props = {
  params: { productId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerSupabaseClient();
  const tenantId = getPublicMarketplaceTenantId();
  const result = await loadCatalogPdpPage(supabase, {
    productId: params.productId,
    tenantId,
  });

  if (result.kind === "not_found") {
    return { title: "Product", robots: { index: false, follow: false } };
  }

  return buildPdpMetadata(result.viewModel);
}

export default async function ProductCatalogPage({ params }: Props) {
  const supabase = await createServerSupabaseClient();
  const tenantId = getPublicMarketplaceTenantId();
  const result = await loadCatalogPdpPage(supabase, {
    productId: params.productId,
    tenantId,
  });

  if (result.kind === "not_found") {
    notFound();
  }

  const viewModel = result.viewModel;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const favoriteProductIds = user ? await getFavoriteIdsForUser() : [];
  const isAuthenticated = Boolean(user);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <ProductMarketDetailView
        product={viewModel}
        initialFavorited={favoriteProductIds.includes(params.productId)}
        isAuthenticated={isAuthenticated}
      />
      {viewModel.specGroups.length > 0 ? (
        <ProductDisplaySpecsSection specGroups={viewModel.specGroups} />
      ) : null}
    </div>
  );
}
