export type GovernanceIssue = {
  code: string;
  message: string;
  level: "error" | "warning";
};

export type GovernanceResult = {
  blockingErrors: GovernanceIssue[];
  warnings: GovernanceIssue[];
  publishReady: boolean;
};

export function mergeGovernanceResults(...results: GovernanceResult[]): GovernanceResult {
  const blockingErrors: GovernanceIssue[] = [];
  const warnings: GovernanceIssue[] = [];
  for (const r of results) {
    blockingErrors.push(...r.blockingErrors);
    warnings.push(...r.warnings);
  }
  return {
    blockingErrors,
    warnings,
    publishReady: blockingErrors.length === 0,
  };
}

export function issue(
  code: string,
  message: string,
  level: GovernanceIssue["level"],
): GovernanceIssue {
  return { code, message, level };
}
