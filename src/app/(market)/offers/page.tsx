import { MarketEmptyState } from "@/components/market/MarketEmptyState";
import { MarketFilters } from "@/components/market/MarketFilters";
import { MarketPagination } from "@/components/market/MarketPagination";
import { MarketSearchBar } from "@/components/market/MarketSearchBar";
import { CatalogProductViewGrid } from "@/components/market/CatalogProductViewGrid";
import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPrimaryImagesMap } from "@/modules/product-images/server/resolve-public-product-images";
import { getCatalogMarketplaceView, getMarketplaceStats } from "@/modules/market/services/market-discovery-service";
import { toPaginationQuery, parseMarketBrowseSearchParams } from "@/modules/market/utils/browse-params";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function MarketOffersPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tenantId = getPublicMarketplaceTenantId();
  const parsed = parseMarketBrowseSearchParams(searchParams);
  const q = parsed.q.trim();
  const list = await getCatalogMarketplaceView(
    supabase,
    { ...parsed.filters, tenantId },
    q.length > 0 ? q : undefined,
  );
  const products = list.catalogProductViews;
  const productIds = products.map((p) => p.productId);
  const primaryImageUrls =
    productIds.length > 0 ? await getPrimaryImagesMap(tenantId, productIds, supabase) : new Map<string, string>();
  const stats = await getMarketplaceStats(supabase, tenantId);

  const paginationBase = toPaginationQuery(parsed);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Compare products</h1>
          <p className="max-w-2xl text-sm text-zinc-600">
            Κατάλογος αγοράς (listings + catalog): κάθε κάρτα είναι συγκεντρωμένη προβολή (offers merged by catalog id ή
            normalized title/brand/model). Pagination σε επίπεδο offer· identity clustering στον server.{" "}
            {stats.totalActiveOffers} active listings in scope.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <MarketSearchBar
          defaultQuery={parsed.q}
          preserve={{
            minPrice: parsed.raw.minPrice || undefined,
            maxPrice: parsed.raw.maxPrice || undefined,
            condition: parsed.raw.condition || undefined,
          }}
        />
      </div>

      <MarketFilters
        defaults={{
          q: parsed.q.trim() || undefined,
          minPrice: parsed.raw.minPrice,
          maxPrice: parsed.raw.maxPrice,
          condition: parsed.raw.condition,
        }}
      />

      {products.length === 0 ? (
        <MarketEmptyState signedIn={!!user} searched={q.length > 0} />
      ) : (
        <>
          <CatalogProductViewGrid products={products} primaryImageUrls={primaryImageUrls} />
          <MarketPagination page={list.page} hasMore={list.hasMore} params={paginationBase} />
        </>
      )}
    </div>
  );
}
