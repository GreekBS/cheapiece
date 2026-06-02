import "server-only";

import { cache } from "react";

import { requireSessionUser } from "@/lib/auth/require-user";
import { assertMerchantVendorAccess } from "@/lib/merchant/assert-merchant-vendor-access";
import { isVendorOwner } from "@/modules/vendors/queries/vendor-queries";

type LogArgs = {
  event: string;
  caller: string;
  pathname: string | null;
  vendorId?: string;
  userId?: string;
};

function logDedup(args: LogArgs): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    domain: "merchant_store_perf",
    ...args,
  });
  // eslint-disable-next-line no-console -- temporary verification logging
  console.info(line);
}

const getMerchantStoreSessionCached = cache(async () => {
  logDedup({ event: "session_cache_miss", caller: "dedup-cache", pathname: null });
  return requireSessionUser();
});

const getMerchantStoreContextCached = cache(async (vendorId: string) => {
  logDedup({ event: "vendor_access_cache_miss", caller: "dedup-cache", pathname: null, vendorId });
  const { supabase, user } = await getMerchantStoreSessionCached();
  const vendor = await assertMerchantVendorAccess(supabase, user.id, vendorId);
  return { supabase, user, vendor };
});

const getMerchantStoreIsOwnerCached = cache(async (vendorId: string, userId: string) => {
  logDedup({
    event: "permission_owner_cache_miss",
    caller: "dedup-cache",
    pathname: null,
    vendorId,
    userId,
  });
  const { supabase } = await getMerchantStoreSessionCached();
  return isVendorOwner(supabase, vendorId, userId);
});

export async function getMerchantStoreContext(
  vendorId: string,
  meta: { caller: string; pathname: string | null },
) {
  logDedup({
    event: "vendor_access_call",
    caller: meta.caller,
    pathname: meta.pathname,
    vendorId,
  });
  return getMerchantStoreContextCached(vendorId);
}

export async function checkMerchantStoreOwnerPermission(
  vendorId: string,
  userId: string,
  meta: { caller: string; pathname: string | null },
): Promise<boolean> {
  logDedup({
    event: "permission_owner_call",
    caller: meta.caller,
    pathname: meta.pathname,
    vendorId,
    userId,
  });
  return getMerchantStoreIsOwnerCached(vendorId, userId);
}
