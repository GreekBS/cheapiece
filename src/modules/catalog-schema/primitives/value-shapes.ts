import type { AttributePrimitive } from "../types/primitives";

export type MeasurementValue = { value: number; unit: string };
export type DimensionValue = { length: number; width: number; height: number; unit: string };
export type ColorValue = { code: string };
export type MediaGalleryValue = { items: { url: string; sortOrder: number; alt?: string }[] };

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function primitiveExpectsObject(primitive: AttributePrimitive): boolean {
  return (
    primitive === "measurement" ||
    primitive === "weight" ||
    primitive === "dimension" ||
    primitive === "color" ||
    primitive === "media_gallery"
  );
}
