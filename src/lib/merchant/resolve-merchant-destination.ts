import type { SupabaseClient } from "@supabase/supabase-js";

import { merchantStoreHomePath } from "@/lib/merchant/merchant-store-paths";
import { pickPrimaryAccessibleVendor } from "@/modules/vendors/queries/vendor-queries";

/** Guest sign-in entry; authenticated users are redirected away server-side. */
export const MERCHANT_HUB_PATH = "/merchant";

/** Isolated first-store onboarding (no multi-store hub). */
export const MERCHANT_ONBOARDING_PATH = "/merchant/onboarding";

/** True only for the hub gateway itself — not onboarding, stores, or other `/merchant/*` routes. */
export function isMerchantHubEntryPath(path: string): boolean {
  const p = path.trim();
  return p === MERCHANT_HUB_PATH || p === `${MERCHANT_HUB_PATH}/`;
}

/**
 * Single authority for where an authenticated merchant should land.
 *
 * Multi-store hub intentionally frozen.
 * Current UX resolves a single primary store destination.
 * Database multi-store support remains intact.
 */
export async function resolveMerchantDestination(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const primary = await pickPrimaryAccessibleVendor(supabase, userId);
  if (!primary) {
    return MERCHANT_ONBOARDING_PATH;
  }
  return merchantStoreHomePath(primary.id);
}
