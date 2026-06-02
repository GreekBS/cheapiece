import { normalizeTextPart } from "./text";

export function normalizeGtin(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "");
}

export function normalizeMpn(raw: string | null | undefined): string {
  if (!raw) return "";
  return normalizeTextPart(raw).replace(/\s+/g, "").toUpperCase();
}
