import Link from "next/link";

import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { ProductPdpGallery } from "./pdp/ProductPdpGallery";
import { ProductPdpHeroPricing } from "./pdp/ProductPdpHeroPricing";
import { ProductPdpOfferCardsSection } from "./pdp/ProductPdpOfferCardsSection";

type Props = {
  product: ProductMarketViewModel;
  initialFavorited?: boolean;
  isAuthenticated?: boolean;
};

export function ProductMarketDetailView({
  product,
  initialFavorited = false,
  isAuthenticated = false,
}: Props) {
  const heroUrl = product.primaryImageUrl ?? product.galleryImages[0]?.url ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href="/offers"
        className="inline-flex text-sm font-medium text-zinc-500 transition-colors duration-200 ease-out hover:text-zinc-900"
      >
        ← Πίσω στον κατάλογο
      </Link>

      <header className="max-w-3xl space-y-3 border-b border-zinc-200/60 pb-8">
        {(product.brand || product.model) && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {[product.brand, product.model].filter(Boolean).join(" · ")}
          </p>
        )}
        <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-zinc-900 sm:text-4xl">
          {product.title}
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
        <ProductPdpGallery
          title={product.title}
          heroUrl={heroUrl}
          galleryImages={product.galleryImages}
          productId={product.productId}
          initialFavorited={initialFavorited}
          isAuthenticated={isAuthenticated}
        />
        <ProductPdpHeroPricing product={product} />
      </div>

      <ProductPdpOfferCardsSection product={product} />
    </div>
  );
}
