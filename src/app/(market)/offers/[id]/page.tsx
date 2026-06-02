import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOfferById } from "@/modules/market/services/market-discovery-service";
import { getProductIdentity } from "@/modules/market/services/product-identity-service";
import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerSupabaseClient();
  const tenantId = getPublicMarketplaceTenantId();
  const offer = await getOfferById(supabase, params.id, tenantId);
  const title = offer?.title?.slice(0, 120) ?? "Προσφορά";
  return {
    title,
    robots: { index: false, follow: false },
  };
}

function formatMoney(amount: number, currency: string) {
  if (!Number.isFinite(amount)) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Minimal legacy PDP when no active catalog product cluster exists (e.g. inactive-only listing). */
function LegacyOfferOnlyView({ offer }: { offer: MarketOfferDTO }) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/offers" className="inline-flex text-sm font-medium text-zinc-600 hover:text-zinc-900">
        ← Back to catalog
      </Link>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Legacy offer view</p>
        <p className="mt-2 text-sm text-amber-950/90">
          This listing is not on the active product comparison feed. Open the catalog product when it becomes
          available.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">{offer.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">Catalog product id · {offer.productId}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Price</dt>
            <dd className="font-semibold tabular-nums text-zinc-900">{formatMoney(offer.price, offer.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Seller</dt>
            <dd className="font-medium text-zinc-900">{offer.vendorName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Stock</dt>
            <dd className="tabular-nums text-zinc-900">{offer.stock}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Condition</dt>
            <dd className="capitalize text-zinc-800">{offer.condition}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default async function MarketOfferLegacyEntryPage({ params }: Props) {
  const supabase = await createServerSupabaseClient();
  const tenantId = getPublicMarketplaceTenantId();
  const offer = await getOfferById(supabase, params.id, tenantId);
  if (!offer) {
    notFound();
  }

  const product = await getProductIdentity(supabase, offer.productId, tenantId);
  if (product && product.offers.length > 0) {
    redirect(`/products/${offer.productId}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <LegacyOfferOnlyView offer={offer} />
    </div>
  );
}
