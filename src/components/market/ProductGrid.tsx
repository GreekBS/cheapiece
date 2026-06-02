import type { ProductAggregateDTO } from "@/modules/market/types/product-aggregate.dto";

import { ProductCard } from "./ProductCard";

type Props = {
  products: ProductAggregateDTO[];
};

export function ProductGrid({ products }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.productId}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
