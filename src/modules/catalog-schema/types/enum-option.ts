/** Persisted enum values are always `code` — never display labels. */
export type EnumOption = {
  code: string;
  labels: Record<string, string>;
  state?: "active" | "archived";
};

export function isEnumOption(value: unknown): value is EnumOption {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.code === "string" && o.code.length > 0 && typeof o.labels === "object" && o.labels !== null;
}
