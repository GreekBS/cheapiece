import type { CategorySchemaDocument } from "../types/category-schema-document";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { SchemaDocumentMap } from "../schema/inheritance-resolver";

export type InheritanceFieldSource = "local" | "inherited" | "inherited_overridden" | "inherited_hidden";

export type EffectiveFieldView = {
  attributeCode: string;
  source: InheritanceFieldSource;
  sourceCategoryId: string | null;
  sourceCategoryPath: string | null;
  binding: CategorySchemaFieldBinding;
  localBinding?: CategorySchemaFieldBinding;
};

function resolveChain(categoryId: string, documents: SchemaDocumentMap): CategorySchemaDocument[] {
  const chain: CategorySchemaDocument[] = [];
  const visited = new Set<string>();
  let currentId: string | null = categoryId;
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const doc = documents.get(currentId);
    if (!doc) break;
    chain.unshift(doc);
    currentId = doc.inheritsFromCategoryId;
  }
  return chain;
}

/** Admin-only visualization — does not alter kernel resolver. */
export function annotateInheritance(
  document: CategorySchemaDocument,
  documents: SchemaDocumentMap,
): EffectiveFieldView[] {
  const chain = resolveChain(document.categoryId, documents);
  const localDoc = chain[chain.length - 1];
  if (!localDoc) return [];

  const inheritedByCode = new Map<string, { binding: CategorySchemaFieldBinding; categoryId: string; path: string }>();

  for (let i = 0; i < chain.length - 1; i++) {
    const doc = chain[i]!;
    for (const binding of doc.fields) {
      if (!inheritedByCode.has(binding.attributeCode)) {
        inheritedByCode.set(binding.attributeCode, {
          binding,
          categoryId: doc.categoryId,
          path: doc.categoryPath,
        });
      }
    }
  }

  const localByCode = new Map(localDoc.fields.map((b) => [b.attributeCode, b]));
  const views: EffectiveFieldView[] = [];

  for (const [code, localBinding] of localByCode) {
    const inherited = inheritedByCode.get(code);
    if (!inherited) {
      views.push({
        attributeCode: code,
        source: "local",
        sourceCategoryId: localDoc.categoryId,
        sourceCategoryPath: localDoc.categoryPath,
        binding: localBinding,
        localBinding,
      });
      continue;
    }

    const overridden = JSON.stringify(inherited.binding) !== JSON.stringify(localBinding);
    if (localBinding.overrides?.hide) {
      views.push({
        attributeCode: code,
        source: "inherited_hidden",
        sourceCategoryId: inherited.categoryId,
        sourceCategoryPath: inherited.path,
        binding: localBinding,
        localBinding,
      });
    } else if (overridden) {
      views.push({
        attributeCode: code,
        source: "inherited_overridden",
        sourceCategoryId: inherited.categoryId,
        sourceCategoryPath: inherited.path,
        binding: localBinding,
        localBinding,
      });
    } else {
      views.push({
        attributeCode: code,
        source: "inherited",
        sourceCategoryId: inherited.categoryId,
        sourceCategoryPath: inherited.path,
        binding: localBinding,
        localBinding,
      });
    }
  }

  for (const [code, inherited] of inheritedByCode) {
    if (localByCode.has(code)) continue;
    views.push({
      attributeCode: code,
      source: inherited.binding.overrides?.hide ? "inherited_hidden" : "inherited",
      sourceCategoryId: inherited.categoryId,
      sourceCategoryPath: inherited.path,
      binding: inherited.binding,
    });
  }

  return views.sort((a, b) => a.binding.sortOrder - b.binding.sortOrder || a.attributeCode.localeCompare(b.attributeCode));
}
