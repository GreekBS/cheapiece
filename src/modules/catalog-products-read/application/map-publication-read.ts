import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";

import type { ProductPublicationReadDTO } from "../types/product-publication-read.dto";

/** Maps DB publication row to read DTO — strips internal/write-only fields. */
export function mapPublicationToReadDto(row: ProductCatalogPublicationRow): ProductPublicationReadDTO {
  const display = row.display_snapshot;
  return {
    locale: row.locale,
    publishedAt: row.published_at,
    displaySnapshot: {
      locale: display.locale,
      scalars: display.scalars,
      groups: display.groups,
    },
    facets: row.facet_snapshot,
  };
}
