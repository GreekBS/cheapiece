import Link from "next/link";

import { MarketplaceProductCard } from "@/components/marketplace/catalog/MarketplaceProductCard";
import { MarketplaceProductGrid } from "@/components/marketplace/catalog/MarketplaceProductGrid";
import {
  buildCategoryLeafHref,
  categoryBrowseHasSeoFilteredQuery,
  type CategoryBrowseParsed,
} from "@/modules/catalog/queries/category-browse-params";
import type { CategoryFacetCatalogDTO, ProductCardViewModel } from "@/modules/catalog-products-read/ui/client";
import { FacetFilterSidebar } from "@/modules/catalog-products-read/ui/components/FacetFilterSidebar";

type Props = {
  categorySlug: string;
  brands: string[];
  facetCatalog: CategoryFacetCatalogDTO | null;
  cards: ProductCardViewModel[];
  parsed: CategoryBrowseParsed;
  hasMore: boolean;
  favoriteProductIds: readonly string[];
  isAuthenticated: boolean;
};

function selectedFacetsFromParsed(parsed: CategoryBrowseParsed): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of parsed.facetFilters) {
    if (Array.isArray(f.value)) {
      out[f.code] = f.value.join(",");
    } else {
      out[f.code] = String(f.value);
    }
  }
  return out;
}

export function CategoryLeafBrowse({
  categorySlug,
  brands,
  facetCatalog,
  cards,
  parsed,
  hasMore,
  favoriteProductIds,
  isAuthenticated,
}: Props) {
  const favoriteSet = new Set(favoriteProductIds);
  const selectedBrand = parsed.brand ?? "";
  const brandOptions = [...brands];
  if (parsed.brand && !brandOptions.includes(parsed.brand)) {
    brandOptions.push(parsed.brand);
    brandOptions.sort((a, b) => a.localeCompare(b, "el"));
  }

  const selectedFacets = selectedFacetsFromParsed(parsed);
  const showClearLink = categoryBrowseHasSeoFilteredQuery(parsed);

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-start lg:gap-10">
      <FacetFilterSidebar
        categorySlug={categorySlug}
        facetCatalog={facetCatalog}
        brandOptions={brandOptions}
        selectedBrand={selectedBrand}
        sort={parsed.sort}
        selectedFacets={selectedFacets}
        showClearLink={showClearLink}
      />

      <div className="min-w-0 space-y-6">
        <h2 id="category-products-heading" className="text-lg font-semibold text-zinc-900">
          Products
        </h2>
        {cards.length === 0 ? (
          <p className="text-sm text-zinc-600">No results match your filters.</p>
        ) : (
          <MarketplaceProductGrid labelledBy="category-products-heading">
            {cards.map((card) => (
              <li key={card.productId} className="flex justify-center">
                <MarketplaceProductCard
                  href={`/products/${card.productId}`}
                  title={card.title}
                  brand={card.brand}
                  model={card.model}
                  priceLabel={card.priceLabel}
                  imageUrl={card.primaryImageUrl}
                  productId={card.productId}
                  initialFavorited={favoriteSet.has(card.productId)}
                  isAuthenticated={isAuthenticated}
                />
              </li>
            ))}
          </MarketplaceProductGrid>
        )}

        {(parsed.page > 1 || hasMore) && (
          <nav
            className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6"
            aria-label="Pagination"
          >
            {parsed.page > 1 ? (
              <Link
                href={buildCategoryLeafHref(categorySlug, { page: parsed.page - 1 }, parsed)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                ← Previous
              </Link>
            ) : (
              <span className="text-sm text-zinc-400">Previous</span>
            )}
            <span className="text-sm text-zinc-600">Page {parsed.page}</span>
            {hasMore ? (
              <Link
                href={buildCategoryLeafHref(categorySlug, { page: parsed.page + 1 }, parsed)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Next →
              </Link>
            ) : (
              <span className="text-sm text-zinc-400">Next</span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
