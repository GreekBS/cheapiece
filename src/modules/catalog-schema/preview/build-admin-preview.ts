import { AttributeRegistry } from "../registry/attribute-registry";
import { buildSchemaDescriptor } from "../descriptor/build-schema-descriptor";
import { resolveEffectiveSchema, type SchemaDocumentMap } from "../schema/inheritance-resolver";
import { validatePayload } from "../validation/validate-payload";
import { normalizePayload } from "../normalization/canonical-attributes";
import type { CategorySchemaSeed } from "../seed/types";
import type { AttributeDefinition } from "../types/attribute-definition";
import type { SchemaDescriptor } from "../types/schema-descriptor";
import type { PayloadValidationResult } from "../types/validation-result";
import { annotateInheritance, type EffectiveFieldView } from "./annotate-inheritance";
import { buildFormPreviewModel, type FormPreviewGroup } from "./form-preview-model";
import { buildSamplePayload } from "./sample-payloads";
import type { GovernanceIssue } from "../governance/types";

export type AdminPreviewBundleDto = {
  descriptor: SchemaDescriptor;
  effectiveFieldViews: EffectiveFieldView[];
  formPreview: FormPreviewGroup[];
  samplePayloadValues: Record<string, unknown>;
  validation: PayloadValidationResult;
  issues: GovernanceIssue[];
};

export function buildAdminPreview(
  draftSeed: CategorySchemaSeed,
  publishedDocuments: SchemaDocumentMap,
  attributeDefinitions: AttributeDefinition[],
): AdminPreviewBundleDto {
  const registry = AttributeRegistry.from(attributeDefinitions);
  const documents: SchemaDocumentMap = new Map(publishedDocuments);
  documents.set(draftSeed.document.categoryId, draftSeed.document);

  const effective = resolveEffectiveSchema(draftSeed.document, documents, registry);
  const descriptor = buildSchemaDescriptor(effective, draftSeed.matching, draftSeed.denormalize);
  const formPreview = buildFormPreviewModel(descriptor);
  const samplePayload = buildSamplePayload(
    draftSeed.document.id,
    draftSeed.document.categoryId,
    effective,
    draftSeed.document.locale,
  );
  const validation = validatePayload(effective, samplePayload, {
    role: "merchant",
    locale: draftSeed.document.locale,
  });
  const effectiveFieldViews = annotateInheritance(draftSeed.document, documents);

  const issues: GovernanceIssue[] = [];
  for (const view of effectiveFieldViews) {
    if (view.source === "inherited_hidden" && view.binding.requiredLevel === "required") {
      issues.push({
        code: "preview.hidden_required",
        message: `Required field ${view.attributeCode} is hidden by override`,
        level: "warning",
      });
    }
  }
  for (const field of descriptor.fields) {
    if (!field.label?.trim()) {
      issues.push({
        code: "preview.missing_label",
        message: `Missing label for ${field.code}`,
        level: "warning",
      });
    }
  }

  normalizePayload(effective, validation.sanitizedValues, draftSeed.denormalize);

  return {
    descriptor,
    effectiveFieldViews,
    formPreview,
    samplePayloadValues: samplePayload.values,
    validation,
    issues,
  };
}
