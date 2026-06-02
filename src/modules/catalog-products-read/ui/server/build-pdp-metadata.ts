import type { Metadata } from "next";

import type { ProductMarketViewModel } from "../dto/product-market.vm";

function isContentRichOfferless(vm: ProductMarketViewModel): boolean {
  return vm.isOfferless && vm.hasPublication && vm.specGroups.length > 0;
}

/** Tiered robots/title for public PDP (offerless thin pages noindex). */
export function buildPdpMetadata(vm: ProductMarketViewModel): Metadata {
  const titleBase = vm.title.slice(0, 200);
  const canonical = `/products/${vm.productId}`;

  if (vm.hasBuyableOffers || vm.hasActiveOffers) {
    return {
      title: `${titleBase} · compare prices`,
      alternates: { canonical },
      robots: { index: true, follow: true },
    };
  }

  if (isContentRichOfferless(vm)) {
    return {
      title: `${titleBase} · product details`,
      alternates: { canonical },
      robots: { index: true, follow: true },
    };
  }

  return {
    title: titleBase,
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}
