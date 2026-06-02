export type FieldValidationIssue = {
  code: string;
  message: string;
  level: "error" | "warning";
};

export type PayloadValidationResult = {
  ok: boolean;
  fieldErrors: FieldValidationIssue[];
  warnings: FieldValidationIssue[];
  /** Values after stripping admin_only for merchant role. */
  sanitizedValues: Record<string, unknown>;
};
