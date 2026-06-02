/**
 * Immutable schema snapshot factory for evaluator inputs.
 *
 * Snapshot MUST:
 * - be plain JSON-compatible object
 * - contain no class instances, Dates, Maps, Sets
 * - be safe for structured clone + freeze
 */

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/** Detached, deeply frozen DTO snapshot — safe to pass into the pure evaluator. */
export function createImmutableSchemaSnapshot<T>(dto: T): T {
  const clone = structuredClone(dto);
  return deepFreeze(clone);
}
