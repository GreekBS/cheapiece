import type { AttributeDefinition } from "../types/attribute-definition";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { GovernanceIssue, GovernanceResult } from "./types";
import { issue } from "./types";

export function validateEnumSubset(
  binding: CategorySchemaFieldBinding,
  definition: AttributeDefinition,
): GovernanceResult {
  const blockingErrors: GovernanceIssue[] = [];
  const warnings: GovernanceIssue[] = [];
  const subset = binding.overrides?.enumOptionsSubset;
  if (!subset?.length) {
    return { blockingErrors, warnings, publishReady: true };
  }

  const activeCodes = new Set(
    (definition.enumOptions ?? []).filter((o) => o.state !== "archived").map((o) => o.code),
  );

  for (const code of subset) {
    if (!activeCodes.has(code)) {
      blockingErrors.push(
        issue(
          "enum.invalid_subset",
          `Enum subset code "${code}" is not active on ${binding.attributeCode}`,
          "error",
        ),
      );
    }
  }

  return { blockingErrors, warnings, publishReady: blockingErrors.length === 0 };
}

export function validateEnumFieldsForPublish(
  bindings: CategorySchemaFieldBinding[],
  registry: Map<string, AttributeDefinition>,
): GovernanceResult {
  const blockingErrors: GovernanceIssue[] = [];
  const warnings: GovernanceIssue[] = [];

  for (const binding of bindings) {
    const def = registry.get(binding.attributeCode);
    if (!def) continue;
    if (def.primitive !== "enum_single" && def.primitive !== "enum_multi" && def.primitive !== "color") {
      continue;
    }
    const result = validateEnumSubset(binding, def);
    blockingErrors.push(...result.blockingErrors);
    warnings.push(...result.warnings);
  }

  return { blockingErrors, warnings, publishReady: blockingErrors.length === 0 };
}
