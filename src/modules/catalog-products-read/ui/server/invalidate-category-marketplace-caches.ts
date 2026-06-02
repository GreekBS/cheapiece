import "server-only";

import { revalidateTag } from "next/cache";

import {
  brandOptionsTag,
  facetCatalogCategoryTag,
} from "./marketplace-cache-tags";

export type InvalidateCategoryMarketplaceCachesArgs = {
  tenantId: string;
  categoryId: string;
};

function hasScopedId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Invalidates marketplace facet + brand caches for one category bucket.
 * Safe no-op guard: invalidation must never break publish flow.
 */
export function invalidateCategoryMarketplaceCaches(
  args: InvalidateCategoryMarketplaceCachesArgs,
): void {
  const { tenantId, categoryId } = args;

  if (!hasScopedId(tenantId) || !hasScopedId(categoryId)) {
    return;
  }

  try {
    revalidateTag(facetCatalogCategoryTag(tenantId, categoryId));
    revalidateTag(brandOptionsTag(tenantId, categoryId));

    // eslint-disable-next-line no-console -- optional post-publish observability (ids only)
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        event: "schema_publish_cache_invalidation",
        tenantId,
        categoryId,
      }),
    );
  } catch {
    // Safe no-op guard: invalidation must never break publish flow
  }
}
