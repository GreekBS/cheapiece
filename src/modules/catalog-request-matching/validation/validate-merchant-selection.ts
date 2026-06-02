import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side validation for merchantSelectedProductId (hint only).
 * Returns validated id or null — never throws; invalid hints are ignored.
 */
export async function validateMerchantSelectedProductId(
  supabase: SupabaseClient,
  productId: string | null | undefined,
  tenantId: string,
  categoryId: string | null,
): Promise<string | null> {
  const id = productId?.trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from("products")
    .select("id, tenant_id, state, category_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { id: string; tenant_id: string; state: string; category_id: string | null };
  if (row.tenant_id !== tenantId) return null;
  if (row.state !== "active") return null;
  if (categoryId && row.category_id !== categoryId) return null;

  return row.id;
}
