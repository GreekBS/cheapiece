import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveMerchantDestination } from "@/lib/merchant/resolve-merchant-destination";

/** Legacy `/dashboard` — canonical merchant workspace is `/merchant/stores/[vendorId]`. */
export default async function VendorDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/merchant");
  }
  redirect(await resolveMerchantDestination(supabase, user.id));
}
