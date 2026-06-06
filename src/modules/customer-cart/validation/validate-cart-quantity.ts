import { DEFAULT_ADD_QUANTITY, MAX_QUANTITY } from "../constants";

export function normalizeOfferId(raw: string): string {
  return raw.trim();
}

export function parseAddQuantity(raw?: number): number | null {
  const quantity = raw ?? DEFAULT_ADD_QUANTITY;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return null;
  }
  return quantity;
}

export function parseUpdateQuantity(raw: number): number | null {
  if (!Number.isInteger(raw) || raw < 0 || raw > MAX_QUANTITY) {
    return null;
  }
  return raw;
}

export function exceedsStock(targetQuantity: number, stockQuantity: number): boolean {
  return targetQuantity > stockQuantity;
}
