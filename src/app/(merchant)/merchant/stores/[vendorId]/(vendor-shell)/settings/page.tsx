import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { StoreOsSettingsPanel } from "@/components/merchant-store/settings/StoreOsSettingsPanel";
import {
  redirectLegacyStoreOsViewIfPresent,
  type LegacyStoreOsSearchParams,
} from "@/lib/merchant/redirect-legacy-store-os-view-query";
import { getMerchantStoreContext } from "@/lib/merchant/merchant-store-request-dedup";
import {
  canEditVendorStoreProfile,
  fetchVendorStoreProfileById,
} from "@/modules/vendors/queries/vendor-store-profile-queries";

type Props = {
  params: { vendorId: string };
  searchParams: LegacyStoreOsSearchParams;
};

/** Settings-only fetch: store profile fields (does not inflate layout workspace query). */
export default async function MerchantStoreSettingsPage({ params, searchParams }: Props) {
  redirectLegacyStoreOsViewIfPresent(params.vendorId, searchParams);
  const pathname = headers().get("x-log-pathname");

  const { supabase, user, vendor } = await getMerchantStoreContext(params.vendorId, {
    caller: "stores/[vendorId]/(vendor-shell)/settings/page",
    pathname,
  });
  if (!vendor) {
    notFound();
  }

  const { data: profile, error } = await fetchVendorStoreProfileById(supabase, params.vendorId);
  if (error || !profile) {
    notFound();
  }

  const canEdit = await canEditVendorStoreProfile(supabase, params.vendorId, user.id);

  return (
    <StoreOsSettingsPanel
      vendorId={params.vendorId}
      vendorName={vendor.name}
      profile={profile}
      canEdit={canEdit}
    />
  );
}
