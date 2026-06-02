import type { AttributeDefinition } from "../types/attribute-definition";
import type { CategorySchemaDocument } from "../types/category-schema-document";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { CategorySchemaSeed } from "../seed/types";
import type {
  AttributeDefinitionRow,
  CategorySchemaFieldRow,
  CategorySchemaVersionRecord,
  CategorySchemaVersionRow,
} from "./types";

export function attributeDefinitionToRow(
  tenantId: string,
  def: AttributeDefinition,
  id?: string,
): Omit<AttributeDefinitionRow, "created_at" | "updated_at"> {
  return {
    id: id ?? crypto.randomUUID(),
    tenant_id: tenantId,
    code: def.code,
    primitive: def.primitive,
    definition: def,
    state: def.state,
  };
}

export function rowToAttributeDefinition(row: AttributeDefinitionRow): AttributeDefinition {
  return { ...row.definition, code: row.code, primitive: row.primitive as AttributeDefinition["primitive"], state: row.state, tenantId: row.tenant_id };
}

export function seedToVersionRow(
  tenantId: string,
  seed: CategorySchemaSeed,
  state: CategorySchemaVersionRow["state"],
  versionId?: string,
): Omit<CategorySchemaVersionRow, "created_at" | "updated_at"> {
  const doc = seed.document;
  return {
    id: versionId ?? doc.id,
    tenant_id: tenantId,
    category_id: doc.categoryId,
    version: doc.version,
    state,
    inherits_from_category_id: doc.inheritsFromCategoryId,
    category_path: doc.categoryPath,
    locale: doc.locale,
    published_at: doc.publishedAt,
    matching_config: seed.matching,
    denormalize_config: seed.denormalize,
    document_snapshot: seed,
  };
}

export function seedToFieldRows(
  versionId: string,
  seed: CategorySchemaSeed,
): Omit<CategorySchemaFieldRow, "id">[] {
  return seed.document.fields.map((binding) => ({
    schema_version_id: versionId,
    attribute_code: binding.attributeCode,
    binding,
    sort_order: binding.sortOrder,
  }));
}

export function recordToCategorySchemaSeed(record: CategorySchemaVersionRecord): CategorySchemaSeed {
  if (record.version.document_snapshot) {
    return {
      ...record.version.document_snapshot,
      document: {
        ...record.version.document_snapshot.document,
        categoryId: record.version.category_id,
        id: record.version.id,
        version: record.version.version,
        state: record.version.state,
        publishedAt: record.version.published_at,
        inheritsFromCategoryId: record.version.inherits_from_category_id,
        categoryPath: record.version.category_path,
        locale: record.version.locale,
      },
    };
  }

  const document: CategorySchemaDocument = {
    id: record.version.id,
    categoryId: record.version.category_id,
    categoryPath: record.version.category_path,
    version: record.version.version,
    state: record.version.state,
    inheritsFromCategoryId: record.version.inherits_from_category_id,
    tenantId: record.version.tenant_id,
    publishedAt: record.version.published_at,
    locale: record.version.locale,
    fields: record.fields
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => f.binding),
  };

  return {
    document,
    matching: record.version.matching_config,
    denormalize: record.version.denormalize_config,
  };
}

export function assembleDocumentMap(
  records: CategorySchemaVersionRecord[],
): Map<string, CategorySchemaDocument> {
  const map = new Map<string, CategorySchemaDocument>();
  for (const record of records) {
    const seed = recordToCategorySchemaSeed(record);
    map.set(seed.document.categoryId, seed.document);
  }
  return map;
}

export function bindingFromRow(row: CategorySchemaFieldRow): CategorySchemaFieldBinding {
  return row.binding;
}
