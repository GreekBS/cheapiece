export type RequiredLevel = "required" | "recommended" | "optional" | "admin_only";

export const REQUIRED_LEVELS: readonly RequiredLevel[] = [
  "required",
  "recommended",
  "optional",
  "admin_only",
] as const;

export function isRequiredLevel(value: string): value is RequiredLevel {
  return (REQUIRED_LEVELS as readonly string[]).includes(value);
}

/** Whether an empty value is allowed for submit at this level (merchant role). */
export function allowsEmptyForMerchant(level: RequiredLevel): boolean {
  return level === "optional" || level === "admin_only";
}
