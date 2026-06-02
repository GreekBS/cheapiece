import type { SupabaseClient } from "@supabase/supabase-js";

import { invalidatePdpCache } from "@/lib/cache/pdp-cache";

export async function invalidateOfferProductCache(
  supabase: SupabaseClient,
  productId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("products")
    .select("tenant_id")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data?.tenant_id) {
    return;
  }

  await invalidatePdpCache(data.tenant_id as string, productId);
}
