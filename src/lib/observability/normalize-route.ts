/**
 * Low-cardinality route labels for Sentry / metrics (never use raw slug as a tag).
 * Raw pathname belongs in structured logs only (set in middleware).
 */
export function normalizeRouteLabel(pathname: string): string {
  const p = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (p === "" || p === "/") return "/";
  if (/^\/category\/[^/]+$/.test(p)) return "/category/[slug]";
  if (/^\/c\/[^/]+$/.test(p)) return "/c/[slug]";
  if (/^\/products\/[^/]+$/.test(p)) return "/products/[id]";
  if (/^\/offers\/[^/]+$/.test(p)) return "/offers/[id]";
  if (p === "/offers") return "/offers";
  return "other";
}
