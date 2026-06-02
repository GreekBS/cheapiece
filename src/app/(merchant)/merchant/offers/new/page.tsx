import { redirect } from "next/navigation";

import { merchantStoreOffersNewPath } from "@/lib/merchant/merchant-store-paths";
import { MERCHANT_ONBOARDING_PATH } from "@/lib/merchant/resolve-merchant-destination";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { pickPrimaryAccessibleVendor } from "@/modules/vendors/queries/vendor-queries";

type Props = {
  searchParams: { vendorId?: string; productId?: string };
};

/** Legacy alias — uses primary store when `vendorId` is omitted. */
export default async function MerchantOffersNewAliasPage({ searchParams }: Props) {
  let vendorId = searchParams.vendorId?.trim();
  if (!vendorId) {
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
    vendorId = primary.id;
  }
  const q = new URLSearchParams();
  if (searchParams.productId) {
    q.set("productId", searchParams.productId);
  }
  const qs = q.toString();
  const base = merchantStoreOffersNewPath(vendorId);
  redirect(qs ? `${base}?${qs}` : base);
}
