export function shortEntityId(id: string | null | undefined, size = 8): string {
  const raw = (id ?? "").trim();
  if (!raw) return "unknown";
  return raw.slice(0, Math.max(4, size));
}

export function fallbackProductLabel(productId: string | null | undefined): string {
  return `Product ${shortEntityId(productId)}`;
}
