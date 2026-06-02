import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchActiveProductBySlugForTenant } from "@/modules/catalog/queries/product-queries";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerSupabaseClient();
  const tenantId = getPublicMarketplaceTenantId();
  const product = await fetchActiveProductBySlugForTenant(supabase, tenantId, params.slug);
  if (!product) {
    return { title: "Προϊόν", robots: { index: false, follow: false } };
  }
  const title = product.title.slice(0, 200);
  return {
    title,
    description: [product.brand, product.model].filter(Boolean).join(" · ").slice(0, 320) || undefined,
    alternates: { canonical: `/products/${product.id}` },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      type: "website",
    },
  };
}

export default async function CatalogProductSlugPage({ params }: Props) {
  const supabase = await createServerSupabaseClient();
  const tenantId = getPublicMarketplaceTenantId();
  const product = await fetchActiveProductBySlugForTenant(supabase, tenantId, params.slug);
  if (!product) {
    notFound();
  }

  permanentRedirect(`/products/${product.id}`);
}
