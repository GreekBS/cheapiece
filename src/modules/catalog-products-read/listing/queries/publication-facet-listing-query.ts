import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";

import type { ProductIdentityDTO } from "../../types/product-aggregate.dto";
import type { CategoryProductListQuery, FacetFilter } from "../types/category-product-list.dto";
import { applyFacetFilters } from "../apply-facet-filters";
import { facetFilterToContainsFragment } from "../facet-filter-rules";

import { mapPublicationRow, PUBLICATION_SELECT } from "./map-publication-row";

type EmbeddedProduct = {
  id: string;
  tenant_id: string;
  title: string;
  brand: string | null;
  model: string | null;
  slug: string;
  category_id: string | null;
  state: string;
  created_at: string;
};

export type PublicationFacetListingPage = {
  products: ProductIdentityDTO[];
  publicationsByProductId: Map<string, ProductCatalogPublicationRow>;
  hasMore: boolean;
  totalCount: number | null;
};

function mapEmbeddedProduct(p: EmbeddedProduct): ProductIdentityDTO {
  return {
    id: p.id,
    tenantId: p.tenant_id,
    title: p.title,
    brand: p.brand,
    model: p.model,
    slug: p.slug,
    categoryId: p.category_id,
    state: p.state,
  };
}

/**
 * Facet filters operate only on published products.
 * Publication-first: JSONB containment on facet_snapshot + products!inner for category/tenant/active.
 */
export async function fetchPublicationFacetListingPage(
  supabase: SupabaseClient,
  categoryId: string,
  query: CategoryProductListQuery,
  facetFilters: FacetFilter[],
  tenantId?: string,
): Promise<PublicationFacetListingPage> {
  const page = Math.max(query.page, 1);
  const pageSize = Math.min(Math.max(query.pageSize, 1), 48);
  const from = (page - 1) * pageSize;
  const to = from + pageSize; /* inclusive: fetch pageSize + 1 for hasMore */

  const containsFragment = facetFilterToContainsFragment(facetFilters);

  let qb = supabase
    .from("product_catalog_publications")
    .select(`${PUBLICATION_SELECT}, products!inner ( id, tenant_id, title, brand, model, slug, category_id, state, created_at )`, {
      count: "exact",
    })
    .eq("products.category_id", categoryId)
    .eq("products.state", "active")
    .contains("facet_snapshot", containsFragment);

  if (tenantId) {
    qb = qb.eq("tenant_id", tenantId);
  }

  if (query.brand) {
    qb = qb.eq("products.brand", query.brand);
  }

  if (query.sort === "title_asc") {
    qb = qb.order("title", { ascending: true, foreignTable: "products" });
  } else {
    qb = qb.order("created_at", { ascending: false, foreignTable: "products" });
  }

  const { data, error, count } = await qb.range(from, to);

  const publicationsByProductId = new Map<string, ProductCatalogPublicationRow>();
  const products: ProductIdentityDTO[] = [];

  if (error || !data) {
    return { products: [], publicationsByProductId, hasMore: false, totalCount: null };
  }

  for (const raw of data as Record<string, unknown>[]) {
    const publication = mapPublicationRow(raw);
    if (!applyFacetFilters(publication.facet_snapshot, facetFilters)) {
      continue;
    }
    publicationsByProductId.set(publication.product_id, publication);

    const embedded = raw.products as EmbeddedProduct | EmbeddedProduct[] | null;
    const productRow = Array.isArray(embedded) ? embedded[0] : embedded;
    if (productRow) {
      products.push(mapEmbeddedProduct(productRow));
    }
  }

  const hasMore = products.length > pageSize;
  const pageProducts = hasMore ? products.slice(0, pageSize) : products;

  return {
    products: pageProducts,
    publicationsByProductId,
    hasMore,
    totalCount: count ?? null,
  };
}
