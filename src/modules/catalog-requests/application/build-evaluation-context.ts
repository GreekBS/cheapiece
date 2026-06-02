/**
 * Orchestration layer: DB fetch + clock live here — NOT inside evaluateCatalogRequestState.
 *
 * Evaluator receives ONLY immutable snapshot context (see createImmutableSchemaSnapshot).
 */

import type { ReadonlySchemaRepository } from "../types/phase2-schema-baseline";
import type {
  CatalogRequestEvaluationContext,
  CatalogRequestEvaluationInput,
} from "../types/catalog-request-evaluation";
import { createImmutableSchemaSnapshot } from "./immutable-snapshot";
import { assertValidSchemaVersionId } from "./payload-invariants";
import { pinPublishedSchemaVersion } from "./pinned-published-schema";

export async function buildCatalogRequestEvaluationContext(
  repo: ReadonlySchemaRepository,
  request: Pick<CatalogRequestEvaluationInput, "schemaVersionId" | "tenantId" | "categoryId">,
  clock: { now: string },
): Promise<
  | { ok: true; context: CatalogRequestEvaluationContext }
  | { ok: false; errors: Record<string, string[]> }
> {
  const schemaVersionId = assertValidSchemaVersionId(request.schemaVersionId);

  if (!schemaVersionId) {
    return {
      ok: true,
      context: createImmutableSchemaSnapshot({ now: clock.now }) as CatalogRequestEvaluationContext,
    };
  }

  if (!request.categoryId) {
    return {
      ok: false,
      errors: { category_id: ["STRICT mode requires category_id before schema pin."] },
    };
  }

  const pinResult = await pinPublishedSchemaVersion(repo, {
    schemaVersionId,
    tenantId: request.tenantId,
    categoryId: request.categoryId,
  });

  if (!pinResult.ok) {
    return { ok: false, errors: pinResult.errors };
  }

  const pinnedSchema = pinResult.pinned;

  return {
    ok: true,
    context: createImmutableSchemaSnapshot({
      now: clock.now,
      pinnedSchema,
      locale: pinnedSchema.locale,
    }) as CatalogRequestEvaluationContext,
  };
}
