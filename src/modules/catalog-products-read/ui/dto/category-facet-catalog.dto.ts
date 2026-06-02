/** Serializable primitive label for facet UI — no kernel import. */
export type FacetPrimitive =
  | "text"
  | "rich_text"
  | "integer"
  | "decimal"
  | "boolean"
  | "enum_single"
  | "enum_multi"
  | "measurement"
  | "weight"
  | "dimension"
  | "color"
  | "identifier_gtin"
  | "identifier_mpn"
  | "media_gallery"
  | "url"
  | "date";

export type FacetControlKind = "enum" | "boolean" | "number_range" | "text";

export type CategoryFacetEnumOptionDTO = {
  code: string;
  label: string;
};

export type CategoryFacetDefinitionDTO = {
  code: string;
  label: string;
  primitive: FacetPrimitive;
  control: FacetControlKind;
  enumOptions?: CategoryFacetEnumOptionDTO[];
  unit?: string;
  sortOrder: number;
};

/**
 * Facet filter definitions — published schema only.
 * `source` is a literal discriminator; must never be product- or index-derived.
 */
export type CategoryFacetCatalogDTO = {
  source: "published_schema";
  schemaVersionId: string;
  categoryId: string;
  locale: string;
  facets: CategoryFacetDefinitionDTO[];
};

/** Neutral input for pure facet-catalog mapper (server maps descriptor → this). */
export type FacetCatalogSchemaFieldInput = {
  code: string;
  label: string;
  primitive: string;
  filterable: boolean;
  sortOrder: number;
  enumOptions?: CategoryFacetEnumOptionDTO[];
  unit?: string;
};

export type FacetCatalogSchemaInput = {
  schemaVersionId: string;
  categoryId: string;
  locale: string;
  fields: readonly FacetCatalogSchemaFieldInput[];
};
