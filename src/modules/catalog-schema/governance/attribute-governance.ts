import type { AttributeDefinition } from "../types/attribute-definition";
import { isValidAttributeCode } from "../types/attribute-code";
import type { GovernanceResult } from "./types";
import { issue, mergeGovernanceResults } from "./types";

export function validateAttributeDefinition(def: AttributeDefinition): GovernanceResult {
  const blockingErrors = [];
  const warnings = [];

  if (!isValidAttributeCode(def.code)) {
    blockingErrors.push(issue("attribute.invalid_code", `Invalid attribute code: ${def.code}`, "error"));
  }
  if (!def.labels.el && !def.labels.en) {
    warnings.push(issue("attribute.missing_label", `No label for ${def.code}`, "warning"));
  }
  if (def.state === "archived") {
    blockingErrors.push(issue("attribute.archived", `Attribute ${def.code} is archived`, "error"));
  }

  return { blockingErrors, warnings, publishReady: blockingErrors.length === 0 };
}

export function validateAttributeRegistryCoverage(
  attributeCodes: string[],
  registry: Map<string, AttributeDefinition>,
): GovernanceResult {
  const blockingErrors = [];
  for (const code of attributeCodes) {
    const def = registry.get(code);
    if (!def) {
      blockingErrors.push(issue("attribute.orphan", `Unknown attribute: ${code}`, "error"));
      continue;
    }
    if (def.state === "archived") {
      blockingErrors.push(issue("attribute.archived_usage", `Archived attribute in bindings: ${code}`, "error"));
    }
  }
  return { blockingErrors, warnings: [], publishReady: blockingErrors.length === 0 };
}

export function validateNoDuplicateBindings(attributeCodes: string[]): GovernanceResult {
  const seen = new Set<string>();
  const blockingErrors = [];
  for (const code of attributeCodes) {
    if (seen.has(code)) {
      blockingErrors.push(issue("binding.duplicate", `Duplicate binding: ${code}`, "error"));
    }
    seen.add(code);
  }
  return { blockingErrors, warnings: [], publishReady: blockingErrors.length === 0 };
}

export function validateAttributesForPublish(
  attributeCodes: string[],
  registry: Map<string, AttributeDefinition>,
): GovernanceResult {
  return mergeGovernanceResults(
    validateAttributeRegistryCoverage(attributeCodes, registry),
    validateNoDuplicateBindings(attributeCodes),
  );
}
