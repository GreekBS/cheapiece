import "server-only";

/** Tags MUST remain deterministic and stateless across server instances. */

export function facetCatalogVersionTag(
  tenantId: string,
  categoryId: string,
  schemaVersionId: string,
): string {
  return `facet-catalog:${tenantId}:${categoryId}:${schemaVersionId}`;
}

export function facetCatalogCategoryTag(tenantId: string, categoryId: string): string {
  return `facet-catalog:${tenantId}:${categoryId}`;
}

export function brandOptionsTag(tenantId: string, categoryId: string): string {
  return `brand-options:${tenantId}:${categoryId}`;
}
