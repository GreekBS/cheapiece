import { bestDeals, trendingProducts, type DealCard, type TrendingProduct } from "@/components/marketplace-home/marketplace-home-data";
import type { HotProductMock } from "@/components/marketplace-home/hot-products-mock";
import { hotProductsMock } from "@/components/marketplace-home/hot-products-mock";

export type HomeMockProductPdp = {
  id: string;
  title: string;
  price: string;
  oldPrice?: string;
  rating?: string;
  ratingCount?: string;
  description: string;
  badge?: string;
  metaLine?: string;
};

function mockDescription(title: string): string {
  return `${title} — Ενδεικτική περιγραφή για την προβολή προϊόντος στο Tsipis. Σύντομα θα εμφανίζονται τεχνικά χαρακτηριστικά, σύγκριση καταστημάτων και ζωντανές τιμές.`;
}

function fromTrending(p: TrendingProduct): HomeMockProductPdp {
  return {
    id: `trending-${p.id}`,
    title: p.title,
    price: p.bestPrice,
    rating: p.rating,
    ratingCount: p.ratingCount,
    description: mockDescription(p.title),
    badge: p.discount,
    metaLine: `${p.storeCount} καταστήματα · ${p.availability}${p.shipping ? ` · ${p.shipping}` : ""}`,
  };
}

function fromDeal(d: DealCard): HomeMockProductPdp {
  return {
    id: `deal-${d.id}`,
    title: d.title,
    price: d.newPrice,
    oldPrice: d.oldPrice,
    description: mockDescription(d.title),
    badge: d.discountPercent,
    metaLine: `${d.stores} καταστήματα${d.urgency ? ` · ${d.urgency}` : ""}`,
  };
}

function fromHot(p: HotProductMock): HomeMockProductPdp {
  return {
    id: `hot-${p.id}`,
    title: p.title,
    price: p.price,
    rating: p.rating,
    ratingCount: p.ratingCount,
    description: mockDescription(p.title),
    badge: p.badge,
  };
}

export function getHomeMockProduct(productId: string): HomeMockProductPdp | null {
  if (productId.startsWith("trending-")) {
    const raw = productId.slice("trending-".length);
    const p = trendingProducts.find((t) => t.id === raw);
    return p ? fromTrending(p) : null;
  }
  if (productId.startsWith("deal-")) {
    const raw = productId.slice("deal-".length);
    const d = bestDeals.find((x) => x.id === raw);
    return d ? fromDeal(d) : null;
  }
  if (productId.startsWith("hot-")) {
    const raw = productId.slice("hot-".length);
    const p = hotProductsMock.find((x) => x.id === raw);
    return p ? fromHot(p) : null;
  }
  return null;
}

export function homeMockProductParamList(): { productId: string }[] {
  return [
    ...trendingProducts.map((p) => ({ productId: `trending-${p.id}` })),
    ...bestDeals.map((d) => ({ productId: `deal-${d.id}` })),
    ...hotProductsMock.map((p) => ({ productId: `hot-${p.id}` })),
  ];
}
