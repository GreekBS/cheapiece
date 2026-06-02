/** Canonical unit codes after normalization. */
const UNIT_ALIASES: Record<string, string> = {
  gb: "gb",
  g: "g",
  gigabyte: "gb",
  gigabytes: "gb",
  mb: "mb",
  megabyte: "mb",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  gram: "g",
  grams: "g",
  cm: "cm",
  centimeter: "cm",
  centimeters: "cm",
  mm: "mm",
  m: "m",
  meter: "m",
  meters: "m",
  inch: "in",
  inches: "in",
  in: "in",
  mah: "mah",
};

export function normalizeUnit(raw: string | null | undefined): string {
  if (!raw) return "";
  const key = raw.toLowerCase().trim().replace(/\s+/g, "");
  return UNIT_ALIASES[key] ?? key;
}
