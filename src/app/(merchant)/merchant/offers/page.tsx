import { redirect } from "next/navigation";

import { merchantStoreOffersPath } from "@/lib/merchant/merchant-store-paths";
import { MERCHANT_ONBOARDING_PATH } from "@/lib/merchant/resolve-merchant-destination";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { pickPrimaryAccessibleVendor } from "@/modules/vendors/queries/vendor-queries";

type Props = {
  searchParams: { vendorId?: string };
};

/** Legacy alias — primary store offers when `vendorId` is omitted. */
export default async function MerchantOffersAliasPage({ searchParams }: Props) {
  const vendorId = searchParams.vendorId?.trim();
  if (vendorId) {
    redirect(merchantStoreOffersPath(vendorId));
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/merchant");
  }

  const primary = await pickPrimaryAccessibleVendor(supabase, user.id);
  if (!primary) {
    redirect(MERCHANT_ONBOARDING_PATH);
  }
  redirect(merchantStoreOffersPath(primary.id));
}
