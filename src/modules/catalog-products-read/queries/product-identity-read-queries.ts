import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProductIdentityDTO } from "../types/product-aggregate.dto";

function mapProductRow(r: Record<string, unknown>): ProductIdentityDTO {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    title: r.title as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    slug: r.slug as string,
    categoryId: (r.category_id as string | null) ?? null,
    state: r.state as string,
  };
}

export async function fetchActiveProductIdentityById(
  supabase: SupabaseClient,
  productId: string,
  tenantId?: string,
): Promise<ProductIdentityDTO | null> {
  let q = supabase
    .from("products")
    .select("id, tenant_id, title, brand, model, slug, category_id, state")
    .eq("id", productId)
    .eq("state", "active");

  if (tenantId) {
    q = q.eq("tenant_id", tenantId);
  }

  const { data, error } = await q.maybeSingle();
  if (error || !data) {
    return null;
  }

  return mapProductRow(data as Record<string, unknown>);
}
