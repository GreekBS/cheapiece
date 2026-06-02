import { AttributeRegistry } from "../registry/attribute-registry";
import { resolveEffectiveSchema, InheritanceResolutionError, type SchemaDocumentMap } from "../schema/inheritance-resolver";
import { buildSchemaDescriptor } from "../descriptor/build-schema-descriptor";
import { validatePayload } from "../validation/validate-payload";
import type { CategorySchemaSeed } from "../seed/types";
import type { AttributeDefinition } from "../types/attribute-definition";
import type { EffectiveCategorySchema } from "../types/effective-schema";
import { buildSamplePayload } from "../preview/sample-payloads";
import { validateAttributesForPublish } from "./attribute-governance";
import { validateEnumFieldsForPublish } from "./enum-governance";
import {
  validateDenormalizeReferences,
  validateMatchingConfigReferences,
  validateMerchantVisibleSchema,
  validateReservedFields,
} from "./binding-governance";
import type { GovernanceResult } from "./types";
import { issue, mergeGovernanceResults } from "./types";

export type PublishReadinessInput = {
  draftSeed: CategorySchemaSeed;
  publishedDocuments: SchemaDocumentMap;
  attributeDefinitions: AttributeDefinition[];
  locale?: string;
};

export type PublishReadinessOutput = GovernanceResult & {
  effective: EffectiveCategorySchema | null;
};

export function assessPublishReadiness(input: PublishReadinessInput): PublishReadinessOutput {
  const { draftSeed, publishedDocuments, attributeDefinitions } = input;
  const locale = input.locale ?? draftSeed.document.locale;
  const registry = AttributeRegistry.from(attributeDefinitions);
  const registryMap = new Map(attributeDefinitions.map((d) => [d.code, d]));
  const bindings = draftSeed.document.fields;
  const codes = bindings.map((b) => b.attributeCode);

  const documents: SchemaDocumentMap = new Map(publishedDocuments);
  documents.set(draftSeed.document.categoryId, draftSeed.document);

  let effective: EffectiveCategorySchema | null = null;
  const results: GovernanceResult[] = [
    validateAttributesForPublish(codes, registryMap),
    validateEnumFieldsForPublish(bindings, registryMap),
    validateReservedFields(draftSeed.document),
    validateMerchantVisibleSchema(bindings),
    validateMatchingConfigReferences(bindings, draftSeed.matching),
    validateDenormalizeReferences(bindings, draftSeed.denormalize),
  ];

  try {
    effective = resolveEffectiveSchema(draftSeed.document, documents, registry);
    const visible = effective.fields.filter((f) => f.merchantVisible);
    if (visible.length === 0) {
      results.push({
        blockingErrors: [
          issue("effective.empty_visible", "Effective schema has no merchant-visible fields", "error"),
        ],
        warnings: [],
        publishReady: false,
      });
    }
  } catch (e) {
    const message = e instanceof InheritanceResolutionError ? e.message : "Inheritance resolution failed";
    results.push({
      blockingErrors: [issue("inheritance.error", message, "error")],
      warnings: [],
      publishReady: false,
    });
  }

  if (effective) {
    try {
      buildSchemaDescriptor(effective, draftSeed.matching, draftSeed.denormalize);
    } catch (e) {
      results.push({
        blockingErrors: [
          issue("descriptor.build_failed", e instanceof Error ? e.message : "Descriptor build failed", "error"),
        ],
        warnings: [],
        publishReady: false,
      });
    }

    const samplePayload = buildSamplePayload(draftSeed.document.id, draftSeed.document.categoryId, effective, locale);
    const validation = validatePayload(effective, samplePayload, { role: "merchant", locale });
    if (!validation.ok) {
      results.push({
        blockingErrors: validation.fieldErrors.map((fe) =>
          issue(`validation.${fe.code}`, fe.message, "error"),
        ),
        warnings: validation.warnings.map((w) => issue(`validation.${w.code}`, w.message, "warning")),
        publishReady: false,
      });
    } else if (validation.warnings.length > 0) {
      results.push({
        blockingErrors: [],
        warnings: validation.warnings.map((w) => issue(`validation.${w.code}`, w.message, "warning")),
        publishReady: true,
      });
    }
  }

  const merged = mergeGovernanceResults(...results);
  return { ...merged, effective };
}
