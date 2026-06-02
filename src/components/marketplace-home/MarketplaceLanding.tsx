import type { PublicCategoryCard } from "@/modules/catalog/queries/category-queries";

import { MarketplaceCategories } from "./sections/MarketplaceCategories";
import { MarketplaceDeals } from "./sections/MarketplaceDeals";
import { MarketplaceHero } from "./sections/MarketplaceHero";
import { MarketplaceHotProducts } from "./sections/MarketplaceHotProducts";
import { MarketplaceTrending } from "./sections/MarketplaceTrending";
import { MarketplaceTrust } from "./sections/MarketplaceTrust";

type Props = {
  rootCategories: PublicCategoryCard[];
};

export function MarketplaceLanding({ rootCategories }: Props) {
  return (
    <>
      <MarketplaceHero />
      <MarketplaceHotProducts />
      <MarketplaceCategories categories={rootCategories} />
      <MarketplaceTrending />
      <MarketplaceDeals />
      <MarketplaceTrust />
    </>
  );
}
