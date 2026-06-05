import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryLeafBrowse } from "@/components/marketplace-home/category/CategoryLeafBrowse";
import { CategoryGlyph } from "@/components/marketplace-home/marketplace-icons";
import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  categoryBrowseHasSeoFilteredQuery,
  parseCategoryBrowseSearchParams,
} from "@/modules/catalog/queries/category-browse-params";
import {
  fetchPublicCategoryBySlugWithActiveChain,
  fetchPublicDirectChildCategories,
} from "@/modules/catalog/queries/category-queries";
import { getFavoriteIdsForUser } from "@/actions/customer-favorites";
import { getCategoryProductList } from "@/modules/catalog-products-read/listing/get-category-product-list";
import { mapAggregateToProductCardVM } from "@/modules/catalog-products-read/ui/mappers/map-aggregate-to-card-vm";
import { loadCategoryBrandOptions } from "@/modules/catalog-products-read/ui/server/load-category-brand-options";
import { loadCategoryFacetCatalog } from "@/modules/catalog-products-read/ui/server/load-category-facet-catalog";

type Props = {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const supabase = await createServerSupabaseClient();
  const tenantId = getPublicMarketplaceTenantId();
  const category = await fetchPublicCategoryBySlugWithActiveChain(supabase, tenantId, params.slug);
  if (!category) {
    return { title: "Κατηγορία", robots: { index: false, follow: false } };
  }
  const title = category.name.slice(0, 200);
  const parsed = parseCategoryBrowseSearchParams(searchParams ?? {});
  const filtered = categoryBrowseHasSeoFilteredQuery(parsed);

  return {
    title,
    alternates: { canonical: `/category/${params.slug}` },
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, type: "website" },
  };
}

export default async function PublicCategoryPage({ params, searchParams }: Props) {
  const raw = searchParams ?? {};
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const favoriteProductIds = user ? await getFavoriteIdsForUser() : [];
  const isAuthenticated = Boolean(user);
  const tenantId = getPublicMarketplaceTenantId();
  const category = await fetchPublicCategoryBySlugWithActiveChain(supabase, tenantId, params.slug);
  if (!category) notFound();

  const children = await fetchPublicDirectChildCategories(supabase, tenantId, category.id);
  const parsed = parseCategoryBrowseSearchParams(raw);

  const leafData =
    children.length === 0
      ? await (async () => {
          const [brands, facetCatalog, listResult] = await Promise.all([
            loadCategoryBrandOptions(supabase, { tenantId, categoryId: category.id }),
            loadCategoryFacetCatalog(supabase, { tenantId, categoryId: category.id }),
            getCategoryProductList(
              supabase,
              category.id,
              {
                page: parsed.page,
                pageSize: parsed.pageSize,
                sort: parsed.sort,
                brand: parsed.brand,
                facetFilters: parsed.facetFilters,
              },
              { tenantId },
            ),
          ]);

          const cards = listResult.items.map((item) =>
            mapAggregateToProductCardVM(item, listResult.primaryImageUrls.get(item.product.id) ?? null),
          );

          return { brands, facetCatalog, cards, hasMore: listResult.hasMore };
        })()
      : null;

  return (
    <article className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <nav className="text-sm text-zinc-600">
        <Link href="/" className="hover:text-zinc-900">
          Αρχική
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <span className="text-zinc-900">{category.name}</span>
      </nav>

      <header className="space-y-2 border-b border-zinc-200 pb-6">
        <div className="flex items-start gap-4">
          {category.emoji ? (
            <span className="text-4xl leading-none" aria-hidden>
              {category.emoji}
            </span>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700">
              <CategoryGlyph slug={category.slug} />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{category.name}</h1>
            {children.length > 0 ? (
              <p className="mt-2 text-sm text-zinc-600">Υποκατηγορίες</p>
            ) : leafData ? (
              leafData.cards.length > 0 ? (
                <p className="mt-2 text-sm text-zinc-600">Προϊόντα σε αυτή την κατηγορία</p>
              ) : categoryBrowseHasSeoFilteredQuery(parsed) ? (
                <p className="mt-2 text-sm text-zinc-600">Δεν βρέθηκαν προϊόντα για τα επιλεγμένα φίλτρα.</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-600">Δεν υπάρχουν διαθέσιμα προϊόντα σε αυτή την κατηγορία.</p>
              )
            ) : null}
          </div>
        </div>
      </header>

      {children.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {children.map((c) => (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                {c.emoji ? (
                  <span className="text-2xl" aria-hidden>
                    {c.emoji}
                  </span>
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <CategoryGlyph slug={c.slug} />
                  </span>
                )}
                <span className="font-medium">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {children.length === 0 && leafData ? (
        <CategoryLeafBrowse
          categorySlug={category.slug}
          brands={leafData.brands}
          facetCatalog={leafData.facetCatalog}
          cards={leafData.cards}
          parsed={parsed}
          hasMore={leafData.hasMore}
          favoriteProductIds={favoriteProductIds}
          isAuthenticated={isAuthenticated}
        />
      ) : null}
    </article>
  );
}
