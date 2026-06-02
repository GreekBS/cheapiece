import { notFound, redirect } from "next/navigation";

import { redirectDashboardToStoreOs } from "@/lib/merchant/redirect-dashboard-to-store-os";
import { merchantStoreOfferEditPath } from "@/lib/merchant/merchant-store-paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchStoreProductById } from "@/modules/offers/queries/store-product-queries";

type Props = {
  params: { slug?: string[] };
  searchParams: { vendorId?: string; productId?: string };
};

/** Phase 4 C2/C3: legacy `/dashboard/*` → Store OS (redirect-only gateway). */
export default async function DashboardLegacyCatchAllRedirectPage({ params, searchParams }: Props) {
  const segments = params.slug ?? [];

  if (segments[0] === "offers") {
    if (segments[1] === "new") {
      await redirectDashboardToStoreOs("offer-new", {
        vendorId: searchParams.vendorId,
        productId: searchParams.productId,
      });
    }
    if (segments.length === 3 && segments[2] === "edit" && segments[1]) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        redirect("/merchant");
      }
      const offer = await fetchStoreProductById(supabase, segments[1]);
      if (!offer) {
        notFound();
      }
      redirect(merchantStoreOfferEditPath(offer.vendor_id, segments[1]));
    }
    await redirectDashboardToStoreOs("offers");
  }

  if (segments[0] === "catalog-requests") {
    if (segments[1] === "new") {
      await redirectDashboardToStoreOs("catalog-request-new", { vendorId: searchParams.vendorId });
    }
    await redirectDashboardToStoreOs("products");
  }

  await redirectDashboardToStoreOs("home");
}
