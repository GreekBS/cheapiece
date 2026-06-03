import Link from "next/link";

import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { ProductPdpGallery } from "./pdp/ProductPdpGallery";
import { ProductPdpHeroPricing } from "./pdp/ProductPdpHeroPricing";
import { ProductPdpOfferCardsSection } from "./pdp/ProductPdpOfferCardsSection";

type Props = {
  product: ProductMarketViewModel;
};

export function ProductMarketDetailView({ product }: Props) {
  const heroUrl = product.primaryImageUrl ?? product.galleryImages[0]?.url ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href="/offers"
        className="inline-flex text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
      >
        ← Πίσω στον κατάλογο
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-10">
        <ProductPdpGallery title={product.title} heroUrl={heroUrl} galleryImages={product.galleryImages} />
        <ProductPdpHeroPricing product={product} />
      </div>

      <header className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        {(product.brand || product.model) && (
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {[product.brand, product.model].filter(Boolean).join(" · ")}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{product.title}</h1>
      </header>

      <ProductPdpOfferCardsSection product={product} />
    </div>
  );
}
