import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductMatchLabel = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
};

export async function fetchProductMatchLabelsByIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, ProductMatchLabel>> {
  const map = new Map<string, ProductMatchLabel>();
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("products")
    .select("id, title, brand, model")
    .in("id", ids);

  if (error || !data) return map;

  for (const row of data as Record<string, unknown>[]) {
    map.set(row.id as string, {
      id: row.id as string,
      title: row.title as string,
      brand: (row.brand as string | null) ?? null,
      model: (row.model as string | null) ?? null,
    });
  }

  return map;
}
