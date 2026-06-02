import { resolveEffectiveSchema, type SchemaDocumentMap } from "../schema/inheritance-resolver";
import type { AttributeRegistry } from "../registry/attribute-registry";
import { validatePayload } from "../validation/validate-payload";
import { normalizePayload, toCanonicalSnapshot } from "../normalization/canonical-attributes";
import { buildSchemaDescriptor } from "../descriptor/build-schema-descriptor";
import { findMatchCandidates } from "../matching/match-candidates";
import type { CatalogPayload } from "../types/payload";
import type { SchemaDescriptor } from "../types/schema-descriptor";
import type { PayloadValidationResult } from "../types/validation-result";
import type { MatchCandidatesResult } from "../types/matching";
import type { CanonicalAttributesSnapshot } from "../types/payload";
import type { CategorySchemaSeed } from "../seed/types";
import type { CatalogMatchIndex } from "../types/matching";
import type { NormalizedPayload } from "../normalization/canonical-attributes";

export type CatalogPipelineRole = "merchant" | "admin";

export type CatalogPipelineInput = {
  categoryId: string;
  payload: CatalogPayload;
  role: CatalogPipelineRole;
  registry: AttributeRegistry;
  documents: SchemaDocumentMap;
  schemaSeed: CategorySchemaSeed;
  matchIndex?: CatalogMatchIndex;
};

export type CatalogPipelineResult = {
  ok: boolean;
  validation: PayloadValidationResult;
  normalized: NormalizedPayload | null;
  snapshot: CanonicalAttributesSnapshot | null;
  descriptor: SchemaDescriptor | null;
  matches: MatchCandidatesResult | null;
};

/**
 * Deterministic Phase 0 pipeline:
 * resolve → validate → normalize → descriptor → optional matching
 */
export function runCatalogPipeline(input: CatalogPipelineInput): CatalogPipelineResult {
  const { categoryId, payload, role, registry, documents, schemaSeed, matchIndex } = input;
  const document = documents.get(categoryId);
  if (!document) {
    return failedValidation(`No schema for category: ${categoryId}`);
  }

  const effective = resolveEffectiveSchema(document, documents, registry);
  const validation = validatePayload(effective, payload, {
    role,
    locale: document.locale,
  });

  if (!validation.ok) {
    return {
      ok: false,
      validation,
      normalized: null,
      snapshot: null,
      descriptor: null,
      matches: null,
    };
  }

  const normalized = normalizePayload(effective, validation.sanitizedValues, schemaSeed.denormalize);
  const snapshot = toCanonicalSnapshot(document.id, normalized);
  const descriptor = buildSchemaDescriptor(effective, schemaSeed.matching, schemaSeed.denormalize);

  let matches: MatchCandidatesResult | null = null;
  if (matchIndex) {
    matches = findMatchCandidates(
      matchIndex,
      schemaSeed.matching,
      normalized.values,
      normalized.denormalized,
      categoryId,
    );
  }

  return {
    ok: true,
    validation,
    normalized,
    snapshot,
    descriptor,
    matches,
  };
}

function failedValidation(message: string): CatalogPipelineResult {
  return {
    ok: false,
    validation: {
      ok: false,
      fieldErrors: [{ code: "_schema", message, level: "error" }],
      warnings: [],
      sanitizedValues: {},
    },
    normalized: null,
    snapshot: null,
    descriptor: null,
    matches: null,
  };
}
