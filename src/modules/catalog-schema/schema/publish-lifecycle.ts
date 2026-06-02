import type { CategorySchemaDocument } from "../types/category-schema-document";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import { isReservedSystemAttributeCode } from "../types/attribute-code";

export class PublishedSchemaMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishedSchemaMutationError";
  }
}

/** Published schemas are immutable — only archival is allowed downstream. */
export function assertMutableDraft(document: CategorySchemaDocument): void {
  if (document.state === "published") {
    throw new PublishedSchemaMutationError(
      `Schema ${document.id} v${document.version} is published and cannot be modified.`,
    );
  }
}

export function assertCanPublish(document: CategorySchemaDocument): void {
  if (document.state !== "draft") {
    throw new PublishedSchemaMutationError("Only draft schemas can be published.");
  }
  const codes = new Set(document.fields.map((f) => f.attributeCode));
  if (!codes.has("core.title")) {
    throw new PublishedSchemaMutationError("Missing reserved field: core.title");
  }
}

export function publishSchema(document: CategorySchemaDocument, publishedAt: string): CategorySchemaDocument {
  assertCanPublish(document);
  return {
    ...document,
    state: "published",
    publishedAt,
  };
}

export function assertFieldRemovalAllowed(
  document: CategorySchemaDocument,
  attributeCode: string,
): void {
  if (document.state === "published" && isReservedSystemAttributeCode(attributeCode)) {
    throw new PublishedSchemaMutationError(`Cannot remove reserved field ${attributeCode} from published schema.`);
  }
}

export function diffFieldBindings(
  before: CategorySchemaFieldBinding[],
  after: CategorySchemaFieldBinding[],
): { added: string[]; removed: string[]; changed: string[] } {
  const beforeMap = new Map(before.map((f) => [f.attributeCode, f]));
  const afterMap = new Map(after.map((f) => [f.attributeCode, f]));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const code of afterMap.keys()) {
    if (!beforeMap.has(code)) added.push(code);
    else if (JSON.stringify(beforeMap.get(code)) !== JSON.stringify(afterMap.get(code))) {
      changed.push(code);
    }
  }
  for (const code of beforeMap.keys()) {
    if (!afterMap.has(code)) removed.push(code);
  }

  return { added, removed, changed };
}
