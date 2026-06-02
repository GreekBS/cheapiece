export type VariantDedupFeatureFlags = {
  /** Master switch — when false, L1/L3/guards become no-ops (passthrough). */
  variantDedupEnabled: boolean;
  /** When false, link mismatch does not block (override not required). */
  variantStrictLinkValidation: boolean;
  /** When false, pending sibling does not block create. */
  variantPendingSiblingBlock: boolean;
  /** When true, run full logic but never block — shadow logs only. */
  variantDedupShadowMode: boolean;
};

function parseBoolEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === "") {
    return defaultValue;
  }
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return defaultValue;
}

let cachedFlags: VariantDedupFeatureFlags | null = null;

/** Env-driven feature flags — all default TRUE except shadow mode (FALSE). */
export function getVariantDedupFlags(): VariantDedupFeatureFlags {
  if (cachedFlags) {
    return cachedFlags;
  }
  cachedFlags = {
    variantDedupEnabled: parseBoolEnv("VARIANT_DEDUP_ENABLED", true),
    variantStrictLinkValidation: parseBoolEnv("VARIANT_STRICT_LINK_VALIDATION", true),
    variantPendingSiblingBlock: parseBoolEnv("VARIANT_PENDING_SIBLING_BLOCK", true),
    variantDedupShadowMode: parseBoolEnv("VARIANT_DEDUP_SHADOW_MODE", false),
  };
  return cachedFlags;
}

/** Test-only: reset cached flags between test cases. */
export function resetVariantDedupFlagsCacheForTests(): void {
  cachedFlags = null;
}

export function isVariantDedupEnabled(): boolean {
  return getVariantDedupFlags().variantDedupEnabled;
}

export function isVariantDedupShadowMode(): boolean {
  const flags = getVariantDedupFlags();
  return flags.variantDedupEnabled && flags.variantDedupShadowMode;
}

export function shouldEnforceStrictLinkValidation(): boolean {
  const flags = getVariantDedupFlags();
  return flags.variantDedupEnabled && flags.variantStrictLinkValidation;
}

export function shouldEnforcePendingSiblingBlock(): boolean {
  const flags = getVariantDedupFlags();
  return flags.variantDedupEnabled && flags.variantPendingSiblingBlock;
}
