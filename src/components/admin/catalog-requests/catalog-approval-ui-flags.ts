/** Client-side UI rollout toggles — no backend behavior change. */
export type CatalogApprovalUiFlags = {
  collapsedCreateOnLink: boolean;
  requireOverrideReason: boolean;
  twoStepOverride: boolean;
  verticalStackOnLink: boolean;
};

const DEFAULT_FLAGS: CatalogApprovalUiFlags = {
  collapsedCreateOnLink: true,
  requireOverrideReason: true,
  twoStepOverride: true,
  verticalStackOnLink: true,
};

function parseLocalFlag(key: keyof CatalogApprovalUiFlags, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`ui.catalogApproval.${key}`);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function getCatalogApprovalUiFlags(): CatalogApprovalUiFlags {
  return {
    collapsedCreateOnLink: parseLocalFlag(
      "collapsedCreateOnLink",
      DEFAULT_FLAGS.collapsedCreateOnLink,
    ),
    requireOverrideReason: parseLocalFlag(
      "requireOverrideReason",
      DEFAULT_FLAGS.requireOverrideReason,
    ),
    twoStepOverride: parseLocalFlag("twoStepOverride", DEFAULT_FLAGS.twoStepOverride),
    verticalStackOnLink: parseLocalFlag("verticalStackOnLink", DEFAULT_FLAGS.verticalStackOnLink),
  };
}

export const MIN_OVERRIDE_REASON_LENGTH = 10;
