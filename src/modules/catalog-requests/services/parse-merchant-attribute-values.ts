const ATTR_PARAM_PATTERN = /^attr\[(.+)\]$/;

function parseScalarValue(raw: string): string | number | boolean {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const num = Number(trimmed);
  if (trimmed.length > 0 && Number.isFinite(num) && String(num) === trimmed) {
    return num;
  }
  return trimmed;
}

/**
 * Extracts attribute values from form fields `attr[code]` — values only, no meta.
 */
export function parseAttributeValuesFromFormData(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const key of formData.keys()) {
    const match = key.match(ATTR_PARAM_PATTERN);
    if (!match) continue;
    const code = match[1]?.trim();
    if (!code) continue;

    const all = formData.getAll(key).map((v) => String(v).trim()).filter((v) => v.length > 0);
    if (all.length === 0) continue;

    if (all.length > 1) {
      values[code] = all;
      continue;
    }

    values[code] = parseScalarValue(all[0]!);
  }

  return values;
}
