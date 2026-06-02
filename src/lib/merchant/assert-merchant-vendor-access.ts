import type { SupabaseClient } from "@supabase/supabase-js";



import {

  fetchMerchantAccessSessionDebug,

  fetchProfileTenantDebug,

  isMerchantAccessDebugEnabled,

  logMerchantDebug,

  recordMerchantAccessFailure,

  type MerchantAccessDebugSnapshot,

} from "@/lib/debug/merchant-access-debug";

import { fetchProfileForUser } from "@/modules/identity/queries/profile-queries";

import type { VendorRow } from "@/modules/vendors/queries/vendor-queries";



/**

 * Returns the vendor row if the user may access this store (owner, active member, or platform_admin with RLS-visible row).

 * Use with `notFound()` when null — do not redirect to hub (enumeration-safe).

 */

export async function assertMerchantVendorAccess(

  supabase: SupabaseClient,

  userId: string,

  vendorId: string,

): Promise<VendorRow | null> {

  if (isMerchantAccessDebugEnabled()) {

    const session = await fetchMerchantAccessSessionDebug(supabase);

    logMerchantDebug("assertMerchantVendorAccess_start", { vendorId, userId, session });

  }



  const { data: row, error } = await supabase

    .from("vendors")

    .select("id, name, slug, state, owner_user_id, tenant_id, logo_url")

    .eq("id", vendorId)

    .maybeSingle();



  if (error || !row) {

    if (isMerchantAccessDebugEnabled()) {

      const profile = await fetchProfileTenantDebug(supabase, userId);

      const session = await fetchMerchantAccessSessionDebug(supabase);

      const reason = error ? "VENDOR_SELECT_ERROR" : "VENDOR_SELECT_EMPTY";

      const snapshot: MerchantAccessDebugSnapshot = {

        vendorId,

        userId,

        reason,

        session: {

          exists: session.exists,

          hasAccessToken: session.hasAccessToken,

          userId: session.userId,

        },

        profile,

        vendor: {

          rowReturned: false,

          ownerUserId: null,

          tenantId: null,

          selectError: error?.message ?? null,

          selectCode: error?.code ?? null,

          selectDetails: error?.details ?? null,

          selectHint: error?.hint ?? null,

          likelyRlsFiltered: !error && !row,

        },

        checks: {

          isPlatformAdmin: profile.role === "platform_admin",

          isOwner: false,

          ownerMatchesUser: false,

          profileTenantMatchesVendorTenant: null,

        },

      };

      recordMerchantAccessFailure(snapshot);

      logMerchantDebug("assertMerchantVendorAccess_vendor_select_failed", {

        vendorId,

        userId,

        error: error?.message ?? null,

        likelyRlsFiltered: !error && !row,

      });

    }

    return null;

  }



  const v = row as VendorRow;



  const profile = await fetchProfileForUser(supabase, userId);

  const profileDebug = isMerchantAccessDebugEnabled()

    ? await fetchProfileTenantDebug(supabase, userId)

    : null;



  if (profile?.role === "platform_admin") {

    if (isMerchantAccessDebugEnabled()) {

      logMerchantDebug("assertMerchantVendorAccess_granted", {

        vendorId,

        userId,

        grant: "platform_admin",

        vendorTenantId: v.tenant_id,

        profileTenantId: profileDebug?.tenantId ?? null,

      });

    }

    return v;

  }



  if (v.owner_user_id === userId) {

    if (isMerchantAccessDebugEnabled()) {

      logMerchantDebug("assertMerchantVendorAccess_granted", {

        vendorId,

        userId,

        grant: "owner_user_id",

        vendorTenantId: v.tenant_id,

        profileTenantId: profileDebug?.tenantId ?? null,

        profileTenantMatchesVendorTenant:

          profileDebug?.tenantId != null ? profileDebug.tenantId === v.tenant_id : null,

      });

    }

    return v;

  }



  const { data: membership, error: memErr } = await supabase

    .from("vendor_members")

    .select("id")

    .eq("vendor_id", vendorId)

    .eq("user_id", userId)

    .eq("status", "active")

    .maybeSingle();



  if (memErr || !membership) {

    if (isMerchantAccessDebugEnabled()) {

      const session = await fetchMerchantAccessSessionDebug(supabase);

      const reason = memErr ? "MEMBERSHIP_SELECT_ERROR" : "NOT_OWNER_NOT_ADMIN_NO_MEMBERSHIP";

      const snapshot: MerchantAccessDebugSnapshot = {

        vendorId,

        userId,

        reason,

        session: {

          exists: session.exists,

          hasAccessToken: session.hasAccessToken,

          userId: session.userId,

        },

        profile: profileDebug ?? {

          exists: !!profile,

          role: profile?.role ?? null,

          tenantId: null,

          selectError: null,

        },

        vendor: {

          rowReturned: true,

          ownerUserId: v.owner_user_id,

          tenantId: v.tenant_id,

          selectError: null,

          selectCode: null,

          selectDetails: null,

          selectHint: null,

          likelyRlsFiltered: false,

        },

        membership: {

          rowReturned: !!membership,

          selectError: memErr?.message ?? null,

        },

        checks: {

          isPlatformAdmin: false,

          isOwner: false,

          ownerMatchesUser: false,

          profileTenantMatchesVendorTenant:

            profileDebug?.tenantId != null ? profileDebug.tenantId === v.tenant_id : null,

        },

      };

      recordMerchantAccessFailure(snapshot);

      logMerchantDebug("assertMerchantVendorAccess_membership_failed", {

        vendorId,

        userId,

        vendorOwnerUserId: v.owner_user_id,

        memErr: memErr?.message ?? null,

      });

    }

    return null;

  }



  if (isMerchantAccessDebugEnabled()) {

    logMerchantDebug("assertMerchantVendorAccess_granted", {

      vendorId,

      userId,

      grant: "vendor_members",

    });

  }



  return v;

}


