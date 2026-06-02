/**
 * Public marketplace catalog tenant — single source of truth for server-side
 * Supabase reads (home categories, category pages, catalog product lists). RLS remains enforced;
 * this id scopes queries so we never mix tenants.
 */
export function getPublicMarketplaceTenantId(): string {
  const id = process.env.NEXT_PUBLIC_DEFAULT_MARKETPLACE_TENANT_ID?.trim();
  if (!id) {
    throw new Error("Missing NEXT_PUBLIC_DEFAULT_MARKETPLACE_TENANT_ID");
  }
  return id;
}
