import "server-only";

import { unstable_cache } from "next/cache";

import { SupabaseSchemaRepository } from "@/modules/catalog-schema/persistence/supabase-schema-repository";
import { pinPublishedSchemaVersion } from "@/modules/catalog-requests/application/pinned-published-schema";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryFacetCatalogDTO } from "../dto/category-facet-catalog.dto";
import { buildCategoryFacetCatalogFromPublishedSchema } from "../mappers/build-category-facet-catalog";
import {
  facetCatalogCategoryTag,
  facetCatalogVersionTag,
} from "./marketplace-cache-tags";
import { resolveActivePublishedSchemaVersion } from "./resolve-active-published-schema-version";

export type LoadCategoryFacetCatalogArgs = {
  tenantId: string;
  categoryId: string;
};

type FacetCatalogVersionArgs = {
  tenantId: string;
  categoryId: string;
  schemaVersionId: string;
  locale: string;
};

async function loadCategoryFacetCatalogForVersion(
  supabase: SupabaseClient,
  args: FacetCatalogVersionArgs,
): Promise<CategoryFacetCatalogDTO | null> {
  const repo = new SupabaseSchemaRepository(supabase);
  const pinResult = await pinPublishedSchemaVersion(repo, {
    schemaVersionId: args.schemaVersionId,
    tenantId: args.tenantId,
    categoryId: args.categoryId,
  });
  if (!pinResult.ok) {
    return null;
  }

  const { descriptor } = pinResult.pinned;

  return buildCategoryFacetCatalogFromPublishedSchema({
    schemaVersionId: args.schemaVersionId,
    categoryId: args.categoryId,
    locale: args.locale,
    fields: descriptor.fields.map((f) => ({
      code: f.code,
      label: f.label,
      primitive: f.primitive,
      filterable: f.filterable,
      sortOrder: f.sortOrder,
      enumOptions: f.enumOptions,
      unit: f.unit,
    })),
  });
}

/**
 * Schema-only facet catalog for category browse. Cached by schema version id.
 * Resolves active published version once per request (not inside cached body).
 */
export async function loadCategoryFacetCatalog(
  supabase: SupabaseClient,
  args: LoadCategoryFacetCatalogArgs,
): Promise<CategoryFacetCatalogDTO | null> {
  const repo = new SupabaseSchemaRepository(supabase);
  const active = await resolveActivePublishedSchemaVersion(repo, args.tenantId, args.categoryId);
  if (!active) {
    return null;
  }

  const versionArgs: FacetCatalogVersionArgs = {
    tenantId: args.tenantId,
    categoryId: args.categoryId,
    schemaVersionId: active.schemaVersionId,
    locale: active.locale,
  };

  const cacheKey = facetCatalogVersionTag(
    args.tenantId,
    args.categoryId,
    active.schemaVersionId,
  );
  const categoryTag = facetCatalogCategoryTag(args.tenantId, args.categoryId);

  const cached = unstable_cache(
    () => loadCategoryFacetCatalogForVersion(supabase, versionArgs),
    [cacheKey],
    { tags: [cacheKey, categoryTag], revalidate: 3600 },
  );

  return cached();
}
