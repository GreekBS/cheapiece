import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { PDP_UNAVAILABLE_MESSAGE, derivePdpShopRows, showPdpPrimaryPrice } from "./derive-pdp-pricing";
import { formatPdpMoney } from "./format-pdp-money";
import { ProductPdpShopList } from "./ProductPdpShopList";

type Props = {
  product: ProductMarketViewModel;
};

function AddToCartPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Σύντομα διαθέσιμο"
      className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
    >
      Προσθήκη στο καλάθι
    </button>
  );
}

export function ProductPdpPriceSection({ product }: Props) {
  const shopRows = derivePdpShopRows(product);
  const showPrimary = showPdpPrimaryPrice(product);
  const primaryOffer = product.primaryOffer;

  if (product.isOfferless) {
    return (
      <section
        className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
        aria-labelledby="pdp-pricing-heading"
      >
        <div className="space-y-2 text-center sm:text-left">
          <h2 id="pdp-pricing-heading" className="sr-only">
            Τιμολόγηση
          </h2>
          <p className="text-base font-medium text-zinc-800">{PDP_UNAVAILABLE_MESSAGE}</p>
        </div>
        <AddToCartPlaceholder />
      </section>
    );
  }

  return (
    <section
      className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="pdp-pricing-heading"
    >
      <h2 id="pdp-pricing-heading" className="sr-only">
        Τιμολόγηση
      </h2>

      {showPrimary && primaryOffer ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Τιμή</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
            {formatPdpMoney(primaryOffer.price, primaryOffer.currency)}
          </p>
        </div>
      ) : null}

      <ProductPdpShopList offers={shopRows} primaryOfferId={primaryOffer?.id ?? null} />

      <AddToCartPlaceholder />

      <p className="text-xs text-zinc-400">
        Σύγκριση καταστημάτων — μόνο για ανάγνωση. Η λίστα εξαρτάται από τη σύνδεσή σας και τα δικαιώματα πρόσβασης.
      </p>
    </section>
  );
}
