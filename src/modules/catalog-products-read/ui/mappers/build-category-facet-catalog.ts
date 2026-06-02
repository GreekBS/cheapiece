import type {
  CategoryFacetCatalogDTO,
  CategoryFacetDefinitionDTO,
  FacetCatalogSchemaInput,
  FacetControlKind,
  FacetPrimitive,
} from "../dto/category-facet-catalog.dto";

const FILTERABLE_PRIMITIVES = new Set<string>([
  "integer",
  "decimal",
  "boolean",
  "enum_single",
  "enum_multi",
  "measurement",
  "weight",
  "dimension",
  "color",
]);

function toFacetPrimitive(value: string): FacetPrimitive {
  const known: FacetPrimitive[] = [
    "text",
    "rich_text",
    "integer",
    "decimal",
    "boolean",
    "enum_single",
    "enum_multi",
    "measurement",
    "weight",
    "dimension",
    "color",
    "identifier_gtin",
    "identifier_mpn",
    "media_gallery",
    "url",
    "date",
  ];
  if ((known as string[]).includes(value)) {
    return value as FacetPrimitive;
  }
  return "text";
}

function resolveControl(primitive: string, hasEnum: boolean): FacetControlKind {
  if (hasEnum || primitive === "enum_single" || primitive === "enum_multi" || primitive === "color") {
    return "enum";
  }
  if (primitive === "boolean") {
    return "boolean";
  }
  if (
    primitive === "integer" ||
    primitive === "decimal" ||
    primitive === "measurement" ||
    primitive === "weight" ||
    primitive === "dimension"
  ) {
    return "number_range";
  }
  return "text";
}

function mapField(
  field: FacetCatalogSchemaInput["fields"][number],
): CategoryFacetDefinitionDTO | null {
  if (!field.filterable || !FILTERABLE_PRIMITIVES.has(field.primitive)) {
    return null;
  }

  const hasEnum = (field.enumOptions?.length ?? 0) > 0;
  const primitive = toFacetPrimitive(field.primitive);

  return {
    code: field.code,
    label: field.label,
    primitive,
    control: resolveControl(field.primitive, hasEnum),
    enumOptions: field.enumOptions,
    unit: field.unit,
    sortOrder: field.sortOrder,
  };
}

/**
 * Builds facet catalog from published schema field metadata only.
 * Never accepts product rows, publication snapshots, or index payloads.
 */
export function buildCategoryFacetCatalogFromPublishedSchema(
  input: FacetCatalogSchemaInput,
): CategoryFacetCatalogDTO {
  const facets = input.fields
    .map(mapField)
    .filter((f): f is CategoryFacetDefinitionDTO => f !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  return {
    source: "published_schema",
    schemaVersionId: input.schemaVersionId,
    categoryId: input.categoryId,
    locale: input.locale,
    facets,
  };
}
