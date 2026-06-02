import "server-only";

import type { SchemaRepository } from "@/modules/catalog-schema/persistence/schema-repository";

import {
  pickActivePublishedSchemaVersion,
  type ActivePublishedSchemaVersion,
} from "../policy/active-published-schema";

/**
 * Resolves the active published schema version for a category (highest version).
 */
export async function resolveActivePublishedSchemaVersion(
  repo: SchemaRepository,
  tenantId: string,
  categoryId: string,
): Promise<ActivePublishedSchemaVersion | null> {
  const versions = await repo.listVersionsForCategory(tenantId, categoryId);
  return pickActivePublishedSchemaVersion(
    versions.map((v) => ({
      id: v.id,
      categoryId: v.categoryId,
      version: v.version,
      state: v.state,
      publishedAt: v.publishedAt,
      locale: v.locale,
    })),
  );
}
