import { createHash } from "node:crypto";

import type { SchemaDiffDto } from "./diff-types";

/** Deterministic hash for publish confirmation. */
export function computeDiffHash(diff: SchemaDiffDto): string {
  const canonical = JSON.stringify(diff, (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (value as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return value;
  });
  return createHash("sha256").update(canonical).digest("hex");
}
