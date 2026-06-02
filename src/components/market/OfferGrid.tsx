import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import { OfferCard } from "./OfferCard";

type Props = {
  offers: MarketOfferDTO[];
};

export function OfferGrid({ offers }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {offers.map((offer) => (
        <li key={offer.id}>
          <OfferCard offer={offer} />
        </li>
      ))}
    </ul>
  );
}
