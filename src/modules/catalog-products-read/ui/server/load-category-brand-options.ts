import "server-only";

import { unstable_cache } from "next/cache";

import { fetchDistinctBrandsForLeafCategory } from "@/modules/catalog/queries/product-queries";
import type { SupabaseClient } from "@supabase/supabase-js";

import { brandOptionsTag } from "./marketplace-cache-tags";

export type LoadCategoryBrandOptionsArgs = {
  tenantId: string;
  categoryId: string;
};

/**
 * Cached legacy brand options for category sidebar (scalar filter only).
 * Same query semantics as fetchDistinctBrandsForLeafCategory — wrapper only.
 */
export async function loadCategoryBrandOptions(
  supabase: SupabaseClient,
  args: LoadCategoryBrandOptionsArgs,
): Promise<string[]> {
  const cacheKey = brandOptionsTag(args.tenantId, args.categoryId);

  const cached = unstable_cache(
    () => fetchDistinctBrandsForLeafCategory(supabase, args.tenantId, args.categoryId),
    [cacheKey],
    { tags: [cacheKey], revalidate: 300 },
  );

  return cached();
}
