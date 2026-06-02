import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * TEMPORARY: enable with DEBUG_MERCHANT_ACCESS=1 in .env.local (remove after root-cause found).
 */
export function isMerchantAccessDebugEnabled(): boolean {
  const v = process.env.DEBUG_MERCHANT_ACCESS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export type MerchantAccessFailureReason =
  | "VENDOR_SELECT_ERROR"
  | "VENDOR_SELECT_EMPTY"
  | "NOT_OWNER_NOT_ADMIN_NO_MEMBERSHIP"
  | "MEMBERSHIP_SELECT_ERROR"
  | "SESSION_MISSING";

export type MerchantAccessDebugSnapshot = {
  vendorId: string;
  userId: string;
  reason: MerchantAccessFailureReason;
  session?: {
    exists: boolean;
    hasAccessToken: boolean;
    userId: string | null;
  };
  profile?: {
    exists: boolean;
    role: string | null;
    tenantId: string | null;
    selectError: string | null;
  };
  vendor?: {
    rowReturned: boolean;
    ownerUserId: string | null;
    tenantId: string | null;
    selectError: string | null;
    selectCode: string | null;
    selectDetails: string | null;
    selectHint: string | null;
    likelyRlsFiltered: boolean;
  };
  membership?: {
    rowReturned: boolean;
    selectError: string | null;
  };
  checks?: {
    isPlatformAdmin: boolean;
    isOwner: boolean;
    ownerMatchesUser: boolean;
    profileTenantMatchesVendorTenant: boolean | null;
  };
};

/** Per-request debug state (React cache — one object per RSC request tree). */
export const getMerchantAccessDebugState = cache(() => ({
  lastFailure: null as MerchantAccessDebugSnapshot | null,
}));

function logLine(label: string, payload: Record<string, unknown>): void {
  // eslint-disable-next-line no-console -- debug-only instrumentation
  console.error(
    JSON.stringify(
      {
        ts: new Date().toISOString(),
        label,
        ...payload,
      },
      null,
      2,
    ),
  );
}

export function logMerchantDebug(event: string, fields: Record<string, unknown>): void {
  if (!isMerchantAccessDebugEnabled()) {
    return;
  }
  logLine("merchant_debug", { event, ...fields });
}

export function recordMerchantAccessFailure(snapshot: MerchantAccessDebugSnapshot): void {
  if (!isMerchantAccessDebugEnabled()) {
    return;
  }
  getMerchantAccessDebugState().lastFailure = snapshot;
  logLine("merchant_access_failure", {
    event: "access_denied",
    reason: snapshot.reason,
    vendorId: snapshot.vendorId,
    userId: snapshot.userId,
    snapshot,
  });
}

export function logMerchantNotFoundTrigger(input: {
  file: string;
  line: number;
  caller: string;
  vendorId: string;
  pathname: string | null;
}): void {
  if (!isMerchantAccessDebugEnabled()) {
    return;
  }
  const last = getMerchantAccessDebugState().lastFailure;
  logLine("merchant_not_found_reason", {
    event: "notFound()",
    ...input,
    lastFailure: last,
    summary: last
      ? `${last.reason} (vendor row=${last.vendor?.rowReturned ?? "?"}, owner=${last.vendor?.ownerUserId ?? "?"}, profileTenant=${last.profile?.tenantId ?? "?"}, vendorTenant=${last.vendor?.tenantId ?? "?"})`
      : "no recorded failure — assertMerchantVendorAccess may not have run or debug was off",
  });
}

export async function fetchMerchantAccessSessionDebug(supabase: SupabaseClient) {
  const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] =
    await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  return {
    exists: !!sessionData.session,
    hasAccessToken: !!sessionData.session?.access_token,
    userId: userData.user?.id ?? sessionData.session?.user?.id ?? null,
    sessionError: sessionError?.message ?? null,
    userError: userError?.message ?? null,
  };
}

export async function fetchProfileTenantDebug(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  exists: boolean;
  role: string | null;
  tenantId: string | null;
  selectError: string | null;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { exists: false, role: null, tenantId: null, selectError: error.message };
  }
  if (!data) {
    return { exists: false, role: null, tenantId: null, selectError: null };
  }

  return {
    exists: true,
    role: data.role as string,
    tenantId: (data.tenant_id as string | null) ?? null,
    selectError: null,
  };
}
