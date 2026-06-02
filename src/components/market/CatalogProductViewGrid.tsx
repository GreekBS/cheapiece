import type { CatalogProductViewDTO } from "@/modules/market/types/catalog-product-view.dto";

import { CatalogProductViewCard } from "./CatalogProductViewCard";

type Props = {
  products: CatalogProductViewDTO[];
  primaryImageUrls?: Map<string, string>;
};

export function CatalogProductViewGrid({ products, primaryImageUrls }: Props) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <li key={p.productId}>
          <CatalogProductViewCard
            product={p}
            imageUrl={primaryImageUrls?.get(p.productId) ?? null}
          />
        </li>
      ))}
    </ul>
  );
}
