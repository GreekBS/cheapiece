import type { AttributeRegistry } from "../registry/attribute-registry";
import type { CategorySchemaDocument } from "../types/category-schema-document";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { EffectiveCategorySchema, EffectiveSchemaField } from "../types/effective-schema";

export type SchemaDocumentMap = Map<string, CategorySchemaDocument>;

export class InheritanceResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InheritanceResolutionError";
  }
}

/** Resolve effective schema: parent fields + child overrides by attributeCode. */
export function resolveEffectiveSchema(
  document: CategorySchemaDocument,
  documents: SchemaDocumentMap,
  registry: AttributeRegistry,
): EffectiveCategorySchema {
  const chain = resolveInheritanceChain(document.categoryId, documents);
  const merged = mergeFieldBindings(chain);
  const fields: EffectiveSchemaField[] = [];

  for (const binding of merged) {
    if (binding.overrides?.hide) continue;
    const definition = registry.get(binding.attributeCode);
    if (!definition || definition.state === "archived") {
      throw new InheritanceResolutionError(`Unknown or archived attribute: ${binding.attributeCode}`);
    }
    fields.push({ ...binding, definition });
  }

  fields.sort((a, b) => a.sortOrder - b.sortOrder || a.attributeCode.localeCompare(b.attributeCode));

  return { document, fields };
}

function resolveInheritanceChain(
  categoryId: string,
  documents: SchemaDocumentMap,
): CategorySchemaDocument[] {
  const chain: CategorySchemaDocument[] = [];
  const visited = new Set<string>();
  let currentId: string | null = categoryId;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new InheritanceResolutionError(`Circular inheritance detected at category: ${currentId}`);
    }
    visited.add(currentId);
    const doc = documents.get(currentId);
    if (!doc) {
      throw new InheritanceResolutionError(`Missing schema document for category: ${currentId}`);
    }
    chain.unshift(doc);
    currentId = doc.inheritsFromCategoryId;
  }

  return chain;
}

function mergeFieldBindings(docs: CategorySchemaDocument[]): CategorySchemaFieldBinding[] {
  const byCode = new Map<string, CategorySchemaFieldBinding>();

  for (const doc of docs) {
    for (const field of doc.fields) {
      const existing = byCode.get(field.attributeCode);
      if (!existing) {
        byCode.set(field.attributeCode, { ...field });
        continue;
      }
      byCode.set(field.attributeCode, {
        ...existing,
        ...field,
        overrides: { ...existing.overrides, ...field.overrides },
        validationRules: field.validationRules ?? existing.validationRules,
      });
    }
  }

  return [...byCode.values()];
}
