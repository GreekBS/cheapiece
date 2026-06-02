import type { Metadata } from "next";



import { MarketplaceLanding } from "@/components/marketplace-home/MarketplaceLanding";

import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { fetchPublicRootCategories } from "@/modules/catalog/queries/category-queries";



export const metadata: Metadata = {

  title: "Tsipis — Σύγκριση τιμών & marketplace",

  description:

    "Καθαρή, ήρεμη εμπειρία αγορών. Σύγκριση τιμών, χιλιάδες προϊόντα και ασφαλής πλοήγηση στο marketplace.",

};



export default async function HomePage() {

  const supabase = await createServerSupabaseClient();

  const tenantId = getPublicMarketplaceTenantId();

  const rootCategories = await fetchPublicRootCategories(supabase, tenantId);



  return <MarketplaceLanding rootCategories={rootCategories} />;

}

